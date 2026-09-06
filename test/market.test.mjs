import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { openStore, readAtoms, searchAtoms, readAtom } from '../lib/store.js'
import { validateManifestText, validateManifestObject } from '../lib/validate.js'
import { draftAtom } from '../lib/draft.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

test('store: fixture dir has atoms and full-text search works', () => {
  const atoms = readAtoms(ROOT)
  assert.equal(atoms.length, 2)
  const csv = searchAtoms(atoms, { query: 'CSV', limit: 5 })
  assert.ok(csv.some((a) => a.id === 'data.csv_to_json'))
})

test('store: search stays at summary layer (no description) but carries category', () => {
  const atoms = readAtoms(ROOT)
  const hit = searchAtoms(atoms, { query: 'PDF' })[0]
  assert.equal(hit.intent, '从 PDF 中抽出所有表格')
  assert.equal(hit.category, 'document')
  assert.ok(!('description' in hit), '列表层不应携带 description')
})

test('validate: category accepted when valid, rejected otherwise', () => {
  const ok = validateManifestObject({
    id: 'a.b', layer: 'capability', version: '1.0.0', intent: 'xx',
    category: 'data', input: { type: 'object' }, output: { type: 'object' },
  })
  assert.equal(ok.valid, true)
  const bad = validateManifestObject({
    id: 'a.b', layer: 'capability', version: '1.0.0', intent: 'xx',
    category: 'not-a-category', input: { type: 'object' }, output: { type: 'object' },
  })
  assert.equal(bad.valid, false)
  assert.ok(bad.errors.some((e) => e.includes('category')))
})

test('store: openStore honors DSH_ATOM_STORE_DIR (local override)', async () => {
  const { records, error } = await openStore({ DSH_ATOM_STORE_DIR: ROOT }).load()
  assert.equal(error, undefined)
  assert.equal(records.length, 2)
})

test('store: read by id reveals full manifest incl description', () => {
  const rec = readAtom(readAtoms(ROOT), 'pdf.extract_tables')
  assert.ok(rec)
  assert.equal(rec.manifest.intent, '从 PDF 中抽出所有表格')
  assert.match(rec.manifest.description, /OCR/)
})

test('validate: good manifest passes (description allowed), bad fails', () => {
  const good = validateManifestObject({
    id: 'pdf.extract_tables', layer: 'capability', version: '1.0.0',
    intent: '从 PDF 抽出表格', description: '## 怎么做\nMarkdown 详情。',
    input: { type: 'object' }, output: { type: 'array' },
  })
  assert.equal(good.valid, true)
  const nonStr = validateManifestObject({
    id: 'a.b', layer: 'capability', version: '1.0.0', intent: 'xx',
    input: { type: 'object' }, output: { type: 'object' }, description: 42,
  })
  assert.equal(nonStr.valid, false)
  assert.ok(nonStr.errors.some((e) => e.includes('description')))
  const bad = validateManifestText(JSON.stringify({
    id: 'BAD', version: 'x', verified: true, input: {}, output: {},
  }))
  assert.equal(bad.valid, false)
  assert.ok(bad.errors.some((e) => e.includes('layer')))
  assert.ok(bad.errors.some((e) => e.includes('verified')))
})

test('draft: emits verified:false and notes; honors custom id', () => {
  const d = draftAtom({ intent: '把金额换算成人民币', id: 'money.convert', input: { type: 'object' }, output: { type: 'object' } })
  assert.equal(d.draft.id, 'money.convert')
  assert.equal(d.draft.verified, false)
  assert.ok(d.notes.length > 0)
})
