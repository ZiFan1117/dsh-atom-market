import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import { openStore, searchAtoms, readAtom, type AtomRecord } from './store.js'
import { validateManifestText } from './validate.js'
import { draftAtom, type DraftOptions } from './draft.js'

export const name = 'dsh-atom-market'
export const inject = ['tools']

function renderText(value: JsonValue): Array<{ type: 'text'; text: string }> {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

export function apply(ctx: Context): void {
  const store = openStore(process.env)

  ctx.tools.register(defineTool({
    name: 'atom_search',
    description: '在 Software Atom Market（默认：GitHub 上的软件原子市场仓库）按意图/标签/id 检索能力原子，返回公共字段列表；选中后再用 atom_read 读全量契约。',
    parameters: {
      query: { type: 'string', description: '意图关键词，如 "从 PDF 抽出表格"' },
      layer: { type: 'string', enum: ['capability', 'primitive'], description: '货架层：能力原子 / 实现原语' },
      verified: { type: 'boolean', description: '只返回 verified=true 的原子' },
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
        layer: args.layer,
        verified: args.verified,
        limit: args.limit,
      })
      return { ok: true, count: items.length, items } as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'atom_read',
    description: '读取商店（默认 GitHub）中某个原子的完整 manifest（含 input/output 数据形状与 tests），用于接线、校验与投稿前检查。',
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
      if (!rec) return { ok: false, id: args.id, error: `商店中找不到原子 ${args.id}` } as unknown as JsonValue
      const publicRec: AtomRecord = rec
      return { ok: true, id: rec.id, intent: rec.intent, manifest: publicRec.manifest } as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'atom_validate',
    description: '按 atom.schema.json 的规则校验一份候选 atom manifest（JSON 文本）。投稿前先跑它，挡掉结构错误再开 PR。',
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
    description: '根据一句意图草拟候选 atom manifest（verified:false），返回 draft JSON 与投稿步骤；补齐 input/output 数据形状后即可通过校验。',
    parameters: {
      intent: { type: 'string', required: true, description: '一句话意图，如 "把金额换算成人民币"' },
      id: { type: 'string', description: '可选，自定义 id；默认 contrib.<slug>' },
      input: { type: 'object', additionalProperties: true, description: '可选，输入数据形状（JSON Schema 子集）' },
      output: { type: 'object', additionalProperties: true, description: '可选，输出数据形状' },
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
      if (Array.isArray(args.tags)) o.tags = args.tags as string[]
      return draftAtom(o) as unknown as JsonValue
    },
  }))
}
