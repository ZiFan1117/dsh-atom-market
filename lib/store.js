import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseAtomDocument } from './validate.js';
export const DEFAULT_OWNER = 'ZiFan1117';
export const DEFAULT_REPO = 'software-atom-market';
export const DEFAULT_BRANCH = 'main';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
function isCentral(owner, repo, path) {
    return owner === DEFAULT_OWNER && repo === DEFAULT_REPO && path.startsWith('atoms/');
}
function githubHeaders(token) {
    const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-atom-market' };
    if (token)
        h.Authorization = `Bearer ${token}`;
    return h;
}
async function fetchJson(url, token) {
    try {
        const res = await fetch(url, { headers: githubHeaders(token) });
        if (!res.ok)
            return { error: `HTTP ${res.status}` };
        return { data: (await res.json()) };
    }
    catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
    }
}
async function loadIndex(env) {
    const owner = env.DSH_ATOM_STORE_OWNER ?? DEFAULT_OWNER;
    const repo = env.DSH_ATOM_STORE_REPO ?? DEFAULT_REPO;
    const branch = env.DSH_ATOM_STORE_BRANCH ?? DEFAULT_BRANCH;
    const key = `idx:${owner}/${repo}/${branch}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS)
        return { records: hit.records };
    const { data, error } = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/contents/registry/index.json?ref=${branch}`, env.GITHUB_PERSONAL_ACCESS_TOKEN);
    if (error || !data?.content) {
        return { records: [], error: `无法读取商店索引（${owner}/${repo}@${branch} registry/index.json）：${error ?? '无内容'}；可设 DSH_ATOM_STORE_DIR 指向本地 atoms 目录` };
    }
    let parsed = null;
    try {
        parsed = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    }
    catch {
        parsed = null;
    }
    if (!parsed || !Array.isArray(parsed.atoms)) {
        return { records: [], error: `商店索引格式异常（${owner}/${repo}@${branch} registry/index.json）；可设 DSH_ATOM_STORE_DIR 指向本地 atoms 目录` };
    }
    const records = parsed.atoms
        .filter((a) => typeof a?.id === 'string' && typeof a?.path === 'string')
        .map((a) => ({ ...a, tier: isCentral(owner, repo, a.path) ? 'verified' : 'community' }));
    cache.set(key, { at: Date.now(), records });
    return { records };
}
/** v0.3：把一份 atom 文档文本解析为"有效 manifest"（frontmatter meta + description=正文）。仅 .atom.md。 */
function effectiveManifest(text) {
    const parsed = parseAtomDocument(text);
    if (!parsed.valid) {
        return { error: `atom 文档解析失败：${parsed.errors.join(' | ')}` };
    }
    return { manifest: { ...parsed.meta, description: parsed.body } };
}
export function readLocalDir(root) {
    const atomsDir = join(root, 'atoms');
    if (!existsSync(atomsDir))
        return [];
    return readdirSync(atomsDir)
        .filter((f) => f.endsWith('.atom.md'))
        .map((f) => {
        try {
            const text = readFileSync(join(atomsDir, f), 'utf8');
            const { manifest, error } = effectiveManifest(text);
            if (error || !manifest)
                return null;
            return {
                repo: 'local',
                path: join(atomsDir, f),
                id: String(manifest.id ?? ''),
                intent: String(manifest.intent ?? ''),
                layer: String(manifest.layer ?? ''),
                category: typeof manifest.category === 'string' ? manifest.category : undefined,
                side_effects: typeof manifest.side_effects === 'string' ? manifest.side_effects : undefined,
                version: String(manifest.version ?? ''),
                verified: manifest.verified === true,
                tier: 'verified',
            };
        }
        catch {
            return null;
        }
    })
        .filter((r) => r !== null && r.id.length > 0);
}
export function openStore(env = process.env) {
    if (env.DSH_ATOM_STORE_DIR) {
        const root = env.DSH_ATOM_STORE_DIR;
        return {
            async load() {
                const records = readLocalDir(root);
                if (records.length === 0)
                    return { records: [], error: `DSH_ATOM_STORE_DIR 下没有 *.atom.md：${root}` };
                return { records };
            },
        };
    }
    return { load: () => loadIndex(env) };
}
export async function fetchRecordManifest(rec, token) {
    if (rec.repo === 'local') {
        try {
            const res = effectiveManifest(readFileSync(rec.path, 'utf8'));
            if (res.error)
                return { error: res.error };
            return { manifest: res.manifest };
        }
        catch (e) {
            return { error: `读取本地 atom 文档失败：${e instanceof Error ? e.message : String(e)}` };
        }
    }
    const { data, error } = await fetchJson(`https://api.github.com/repos/${rec.repo}/contents/${rec.path}`, token);
    if (error || !data?.content)
        return { error: `无法从来源仓 ${rec.repo} 读取 ${rec.path}（${error ?? '无内容'}）` };
    try {
        const res = effectiveManifest(Buffer.from(data.content, 'base64').toString('utf8'));
        if (res.error)
            return { error: `来源仓 atom 文档解析失败：${res.error}` };
        return { manifest: res.manifest };
    }
    catch (e) {
        return { error: `来源仓 atom 文档解析失败：${e instanceof Error ? e.message : String(e)}` };
    }
}
export function searchAtoms(records, opts) {
    const q = (opts.query ?? '').trim().toLowerCase();
    const src = opts.source ?? 'all';
    const filtered = records.filter((r) => {
        if (opts.layer && r.layer !== opts.layer)
            return false;
        if (opts.category && r.category !== opts.category)
            return false;
        if (src !== 'all' && r.tier !== src)
            return false;
        if (!q)
            return true;
        const hay = [r.id, r.intent, r.layer, r.category ?? ''].join(' ').toLowerCase();
        return q.split(/\s+/).every((part) => hay.includes(part));
    });
    filtered.sort((a, b) => a.id.localeCompare(b.id));
    const limit = Math.max(1, Math.floor(opts.limit ?? 20));
    return filtered.slice(0, limit);
}
export function readAtom(records, id) {
    return records.find((r) => r.id === id);
}
