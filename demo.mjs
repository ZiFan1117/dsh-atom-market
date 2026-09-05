import { openStore, searchAtoms, readAtom } from './lib/store.js'
import { validateManifestText } from './lib/validate.js'
import { draftAtom } from './lib/draft.js'

const out = {}
out.mode = process.env.DSH_ATOM_STORE_DIR ? `local:${process.env.DSH_ATOM_STORE_DIR}` : 'github (default)'
const { records, error } = await openStore().load()
if (error) {
  out.storeError = error
} else {
  out.storeCount = records.length
  out.searchPdf = searchAtoms(records, { query: 'pdf 表格', limit: 3 })
  const rec = readAtom(records, 'pdf.extract_tables')
  out.readAtom = rec ? { found: true, id: rec.id, intent: rec.intent } : { found: false }
}
out.validateGood = validateManifestText(JSON.stringify({
  id: 'demo.hello', layer: 'capability', version: '0.1.0', intent: '打个招呼',
  input: { type: 'object' }, output: { type: 'object' },
}))
out.validateBad = validateManifestText(JSON.stringify({ id: 'x' }))
out.draft = draftAtom({ intent: '把金额换算成人民币', lang: 'python', tags: ['money'] })
console.log(JSON.stringify(out, null, 2))
