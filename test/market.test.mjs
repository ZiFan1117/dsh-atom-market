import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { openStore, searchAtoms, readAtom, fetchRecordManifest } from '../lib/store.js'
import { validateManifestText, validateManifestObject } from '../lib/validate.js'
import { draftAtom } from '../lib/draft.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

const GOOD_DESC = [
  '## 它做什么',
  '把 X 变 Y。',
  '## 怎么实现',
  '```mermaid\nflowchart LR\n  A[in] --> B[out]\n```',
  '```mermaid\nclassDiagram\n  class A { do() }\n```',
  '```mermaid\nsequenceDiagram\n  participant U as User\n  participant A as Atom\n  U->>A: x\n  A-->>U: y\n```',
  '```mermaid\ngraph TD\n  main --> doIt\n```',
  '## 何时用 / 何时不用',
  '适用。',
  '## 示例',
  'x → y',
].join('\n')

function goodManifest(overrides = {}) {
  return {
    id: 'pdf.extract_tables', layer: 'capability', version: '1.0.0',
    intent: '从 PDF 抽出表格', description: GOOD_DESC,
    input: { type: 'object' }, output: { type: 'array' },
    ...overrides,
  }
}

test('store: local override loads fixtures; search omits description, keeps tier', async () => {
  const { records, error } = await openStore({ DSH_ATOM_STORE_DIR: ROOT }).load()
  assert.equal(error, undefined)
  assert.equal(records.length, 2)
  assert.ok(records.every((r) => r.tier === 'verified'))
  const hit = searchAtoms(records, { query: 'PDF' })[0]
  assert.equal(hit.id, 'pdf.extract_tables')
  assert.ok(!('description' in hit), '搜索层不携带 description')
})

test('store: search filters by source tier', async () => {
  const { records } = await openStore({ DSH_ATOM_STORE_DIR: ROOT }).load()
  const community = searchAtoms(records, { source: 'community' })
  const verified = searchAtoms(records, { source: 'verified' })
  assert.equal(community.length, 0)
  assert.equal(verified.length, 2)
})

test('store: readAtom + fetchRecordManifest returns full manifest incl description', async () => {
  const { records } = await openStore({ DSH_ATOM_STORE_DIR: ROOT }).load()
  const rec = readAtom(records, 'pdf.extract_tables')
  assert.ok(rec)
  const { manifest, error } = await fetchRecordManifest(rec)
  assert.equal(error, undefined)
  assert.match(manifest.description, /flowchart/)
})

test('validate: good passes; missing description or missing diagram fails', () => {
  assert.equal(validateManifestObject(goodManifest()).valid, true)
  const noDesc = goodManifest()
  delete noDesc.description
  const r1 = validateManifestObject(noDesc)
  assert.equal(r1.valid, false)
  assert.ok(r1.errors.some((e) => e.includes('description 必填')))

  const noSeq = goodManifest({ description: GOOD_DESC.replace(/sequenceDiagram[^\n]*/, 'flowchart') })
  const r2 = validateManifestObject(noSeq)
  assert.equal(r2.valid, false)
  assert.ok(r2.errors.some((e) => e.includes('交互时序')), '缺少 sequenceDiagram 应报错')

  const bad = validateManifestText(JSON.stringify({ id: 'BAD', version: 'x', verified: true, input: {}, output: {} }))
  assert.equal(bad.valid, false)
  assert.ok(bad.errors.some((e) => e.includes('layer') || e.includes('description')))
})

test('draft: verified:false, notes mention description diagrams', () => {
  const d = draftAtom({ intent: '把金额换算成人民币', id: 'money.convert', input: { type: 'object' }, output: { type: 'object' } })
  assert.equal(d.draft.id, 'money.convert')
  assert.equal(d.draft.verified, false)
  assert.ok(d.notes.some((n) => n.includes('description 必填')))
})
