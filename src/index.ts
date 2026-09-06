import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import { openStore, searchAtoms, readAtom, fetchRecordManifest } from './store.js'
import { validateManifestText } from './validate.js'
import { draftAtom, type DraftOptions } from './draft.js'

export const name = 'dsh-atom-market'
export const inject = ['tools']

function renderText(value: JsonValue): Array<{ type: 'text'; text: string }> {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

export function apply(ctx: Context): void {
  const store = openStore(process.env)
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN

  ctx.tools.register(defineTool({
    name: 'atom_search',
    description: '在 Software Atom Market（GitHub 商店，topic: software-atom 联邦聚合）按意图/分类检索原子，返回指针级摘要（一句话）；选中后 atom_read 从来源仓实时读完整契约。',
    parameters: {
      query: { type: 'string', description: '意图关键词，如 "从 PDF 抽出表格"' },
      source: { type: 'string', enum: ['verified', 'community', 'all'], description: '来源层级：verified=中央策展 / community=联邦发现 / all=全部，默认 all' },
      category: { type: 'string', description: '主题分类过滤（data/document/money/comms/…）' },
      limit: { type: 'integer', description: '返回条数上限，默认 20' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => renderText(value),
    },
    async execute(args) {
      const { records, error } = await store.load()
      if (error) return { ok: false, error } as unknown as JsonValue
      const items = searchAtoms(records, {
        query: args.query,
        category: args.category,
        source: args.source ?? 'all',
        limit: args.limit,
      }).map((r) => ({ id: r.id, intent: r.intent, tier: r.tier, source: r.repo }))
      return { ok: true, count: items.length, items } as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'atom_read',
    description: '按 id 从来源仓实时读取某个原子的完整 manifest（含 input/output、description 四节四图、tests）。',
    parameters: {
      id: { type: 'string', required: true, description: '原子 id，如 pdf.extract_tables' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => renderText(value),
    },
    async execute(args) {
      const { records, error } = await store.load()
      if (error) return { ok: false, error } as unknown as JsonValue
      const rec = readAtom(records, args.id)
      if (!rec) return { ok: false, id: args.id, error: `索引中找不到原子 ${args.id}` } as unknown as JsonValue
      const fetched = await fetchRecordManifest(rec, token)
      if (fetched.error || !fetched.manifest) {
        return { ok: false, id: args.id, tier: rec.tier, source: rec.repo, error: fetched.error ?? '无 manifest' } as unknown as JsonValue
      }
      return { ok: true, id: rec.id, tier: rec.tier, source: rec.repo, manifest: fetched.manifest } as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'atom_validate',
    description: '按 atom.schema.json（含 description 四节+四图硬检）校验一份候选 atom manifest（JSON 文本）。机器过=可收录，无人工评审。',
    parameters: {
      manifest: { type: 'string', required: true, description: '要校验的完整 manifest JSON 文本' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => renderText(value),
    },
    async execute(args) {
      return validateManifestText(args.manifest) as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'atom_draft',
    description: '根据一句意图草拟候选 atom manifest 骨架（含空 description 占位），返回 draft 与补齐清单（description 需四节+四图才能过机器校验）。',
    parameters: {
      intent: { type: 'string', required: true, description: '一句话意图，如 "把金额换算成人民币"' },
      id: { type: 'string', description: '可选，自定义 id；默认 contrib.<slug>' },
      input: { type: 'object', additionalProperties: true, description: '可选，输入数据形状' },
      output: { type: 'object', additionalProperties: true, description: '可选，输出数据形状' },
      category: { type: 'string', description: '可选，主题分类（data/document/money/comms/…）' },
      tags: { type: 'array', items: { type: 'string' }, description: '可选，检索标签' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => renderText(value),
    },
    async execute(args) {
      const o: DraftOptions = { intent: args.intent, id: args.id }
      if (args.input) o.input = args.input as Record<string, unknown>
      if (args.output) o.output = args.output as Record<string, unknown>
      if (args.category) o.category = args.category
      if (Array.isArray(args.tags)) o.tags = args.tags as string[]
      return draftAtom(o) as unknown as JsonValue
    },
  }))
}
