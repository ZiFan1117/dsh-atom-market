import { validateManifestObject } from './validate.js'

export interface DraftOptions {
  intent: string
  id?: string
  layer?: string
  side_effects?: string
  tags?: string[]
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  lang?: string
  author?: string
  implementation_ref?: string
}

export interface DraftResult {
  draft: Record<string, unknown>
  notes: string[]
}

function slugify(intent: string): string {
  const s = intent.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return s || 'custom'
}

const CONTRIBUTING_STEPS = [
  '运行 node scripts/validate.mjs 校验（仓库根目录）',
  '把 manifest 保存为 atoms/<id>.atom.json（文件名必须等于 id + ".atom.json"）',
  'fork 仓库并开 PR，合并即收录；实现代码留在你自己处，用 implementation_ref 外链',
  '被维护者置 verified:true 前，请补充非空 tests 契约样例',
]

export function draftAtom(opts: DraftOptions): DraftResult {
  const id = (opts.id ?? '').trim() || `contrib.${slugify(opts.intent)}`
  const layer = opts.layer === 'primitive' ? 'primitive' : 'capability'
  const side_effects = opts.side_effects ?? 'none'
  const draft: Record<string, unknown> = {
    id,
    layer,
    version: '0.1.0',
    intent: opts.intent.trim(),
    side_effects,
    verified: false,
  }
  if (opts.tags && opts.tags.length) draft.tags = opts.tags
  if (opts.lang) draft.lang = opts.lang
  if (opts.author) draft.author = opts.author
  if (opts.implementation_ref) draft.implementation_ref = opts.implementation_ref
  if (opts.input) draft.input = opts.input
  if (opts.output) draft.output = opts.output

  const notes: string[] = []
  if (!opts.input || !opts.output) {
    notes.push('缺少 input 或 output：请补上数据形状，否则无法通过校验')
  }
  notes.push('实现代码不入库：请用 implementation_ref 指向你的仓库/npm/API')
  notes.push(...CONTRIBUTING_STEPS)

  const check = validateManifestObject(draft, 'draft')
  if (!check.valid) notes.push(`当前 draft 仍有 ${check.errors.length} 处不合规（加入 input/output 后重跑校验即可消除多数）`)
  return { draft, notes }
}
