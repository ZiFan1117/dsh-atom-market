import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface AtomPublicFields {
  id: string
  intent: string
  layer: string
  side_effects?: string
  version: string
  verified?: boolean
  tags?: string[]
}

export interface AtomRecord extends AtomPublicFields {
  file: string
  manifest: Record<string, unknown>
}

export interface LoadResult {
  records: AtomRecord[]
  error?: string
}

export interface StoreEnv {
  DSH_ATOM_STORE_DIR?: string
  DSH_ATOM_STORE_OWNER?: string
  DSH_ATOM_STORE_REPO?: string
  DSH_ATOM_STORE_BRANCH?: string
  GITHUB_PERSONAL_ACCESS_TOKEN?: string
}

export const DEFAULT_OWNER = 'ZiFan1117'
export const DEFAULT_REPO = 'software-atom-market'
export const DEFAULT_BRANCH = 'main'

const ATOM_SUFFIX = '.atom.json'
const CACHE_TTL_MS = 5 * 60 * 1000
const remoteCache = new Map<string, { at: number; records: AtomRecord[] }>()

function toRecord(manifest: Record<string, unknown>, origin: string): AtomRecord {
  return {
    id: typeof manifest.id === 'string' ? manifest.id : '',
    intent: typeof manifest.intent === 'string' ? manifest.intent : '',
    layer: typeof manifest.layer === 'string' ? manifest.layer : '',
    side_effects: typeof manifest.side_effects === 'string' ? manifest.side_effects : undefined,
    version: typeof manifest.version === 'string' ? manifest.version : '',
    verified: typeof manifest.verified === 'boolean' ? manifest.verified : undefined,
    tags: Array.isArray(manifest.tags) ? (manifest.tags as string[]) : undefined,
    file: origin,
    manifest,
  }
}

export function isStoreRoot(dir: string): boolean {
  const atomsDir = join(dir, 'atoms')
  if (!existsSync(atomsDir) || !statSync(atomsDir).isDirectory()) return false
  try {
    return readdirSync(atomsDir).some((f) => f.endsWith(ATOM_SUFFIX))
  } catch {
    return false
  }
}

export function findStoreRoot(start = process.cwd()): string | null {
  let dir = start
  for (;;) {
    if (isStoreRoot(dir)) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

export function readAtoms(root: string): AtomRecord[] {
  const atomsDir = join(root, 'atoms')
  const files = readdirSync(atomsDir)
    .filter((f) => f.endsWith(ATOM_SUFFIX))
    .sort()
  const records: AtomRecord[] = []
  for (const f of files) {
    try {
      const manifest = JSON.parse(readFileSync(join(atomsDir, f), 'utf8')) as Record<string, unknown>
      if (typeof manifest.id !== 'string') continue
      records.push(toRecord(manifest, join(atomsDir, f)))
    } catch {
      // skip unparsable entries; atom_validate reports content problems separately
    }
  }
  return records
}

async function loadFromGitHub(env: StoreEnv): Promise<LoadResult> {
  const owner = env.DSH_ATOM_STORE_OWNER ?? DEFAULT_OWNER
  const repo = env.DSH_ATOM_STORE_REPO ?? DEFAULT_REPO
  const branch = env.DSH_ATOM_STORE_BRANCH ?? DEFAULT_BRANCH
  const key = `gh:${owner}/${repo}/${branch}`
  const cached = remoteCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { records: cached.records }
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'dsh-atom-market',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = env.GITHUB_PERSONAL_ACCESS_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/atoms?ref=${branch}`,
      { headers },
    )
    if (!listRes.ok) {
      const hint = token ? '' : '；如遇 API 限流，可设置 GITHUB_PERSONAL_ACCESS_TOKEN'
      return {
        records: [],
        error: `GitHub 商店目录读取失败 HTTP ${listRes.status}（${owner}/${repo}@${branch}）${hint}`,
      }
    }
    const entries = (await listRes.json()) as Array<{ type: string; name: string }>
    const files = Array.isArray(entries)
      ? entries.filter((e) => e.type === 'file' && e.name.endsWith(ATOM_SUFFIX))
      : []
    const records: AtomRecord[] = []
    for (const f of files) {
      try {
        const fileRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/atoms/${encodeURIComponent(f.name)}?ref=${branch}`,
          { headers },
        )
        if (!fileRes.ok) continue
        const fileJson = (await fileRes.json()) as { content?: string; encoding?: string }
        if (!fileJson.content) continue
        const text = Buffer.from(fileJson.content, 'base64').toString('utf8')
        const manifest = JSON.parse(text) as Record<string, unknown>
        if (typeof manifest.id !== 'string') continue
        records.push(toRecord(manifest, `github://${owner}/${repo}/${branch}/atoms/${f.name}`))
      } catch {
        // skip a single unreadable atom rather than failing the whole store
      }
    }
    remoteCache.set(key, { at: Date.now(), records })
    return { records }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      records: [],
      error: `无法访问 GitHub 商店（${message}）；如断网，可用 DSH_ATOM_STORE_DIR 指向本地 atoms 目录临时离线`,
    }
  }
}

export function openStore(env: StoreEnv = process.env): { load: () => Promise<LoadResult> } {
  if (env.DSH_ATOM_STORE_DIR) {
    const root = env.DSH_ATOM_STORE_DIR
    return {
      async load() {
        if (!existsSync(join(root, 'atoms'))) {
          return { records: [], error: `DSH_ATOM_STORE_DIR 指向的目录没有 atoms/：${root}` }
        }
        return { records: readAtoms(root) }
      },
    }
  }
  return { load: () => loadFromGitHub(env) }
}

export interface ListOptions {
  query?: string
  layer?: string
  verified?: boolean
  limit?: number
}

export function searchAtoms(records: AtomRecord[], opts: ListOptions): AtomPublicFields[] {
  const q = (opts.query ?? '').trim().toLowerCase()
  const filtered = records.filter((r) => {
    if (opts.layer && r.layer !== opts.layer) return false
    if (opts.verified !== undefined && r.verified !== opts.verified) return false
    if (!q) return true
    const hay = [r.id, r.intent, (r.tags ?? []).join(' ')].join(' ').toLowerCase()
    return q.split(/\s+/).every((part) => hay.includes(part))
  })
  filtered.sort((a, b) => a.id.localeCompare(b.id))
  const limit = Math.max(1, Math.floor(opts.limit ?? 20))
  return filtered.slice(0, limit).map((r) => ({
    id: r.id,
    intent: r.intent,
    layer: r.layer,
    side_effects: r.side_effects,
    version: r.version,
    verified: r.verified,
    tags: r.tags,
  }))
}

export function readAtom(records: AtomRecord[], id: string): AtomRecord | undefined {
  return records.find((r) => r.id === id)
}
