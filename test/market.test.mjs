import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openStore, findStoreRoot, readAtoms, searchAtoms, readAtom } from '../lib/store.js'
import { validateManifestText, validateManifestObject } from '../lib/validate.js'
import { draftAtom } from '../lib/draft.js'

test('store: local dir finds repo atoms and full-text search works', () => {
  const root = findStoreRoot()
  assert.ok(root, 'store root resolvable from plugin dir')
  const atoms = readAtoms(root)
  assert.equal(atoms.length, 4)
  const csv = searchAtoms(atoms, { query: 'CSV', limit: 5 })
  assert.ok(csv.some((a) => a.id === 'data.csv_to_json'))
})

test('store: openStore honors DSH_ATOM_STORE_DIR (local override)', async () => {
  const root = findStoreRoot()
  const { records, error } = await openStore({ DSH_ATOM_STORE_DIR: root }).load()
  assert.equal(error, undefined)
  assert.equal(records.length, 4)
})

test('store: read by id returns full manifest', () => {
  const rec = readAtom(readAtoms(findStoreRoot()), 'pdf.extract_tables')
  assert.ok(rec)
  assert.equal(rec.manifest.intent, '从 PDF 中抽出所有表格')
})

test('validate: good manifest passes, bad manifest lists errors', () => {
  const good = validateManifestObject({
    id: 'pdf.extract_tables', layer: 'capability', version: '1.0.0',
    intent: '从 PDF 抽出表格', input: { type: 'object' }, output: { type: 'array' },
  })
  assert.equal(good.valid, true)
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
