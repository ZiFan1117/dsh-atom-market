import { openStore, searchAtoms, readAtom, fetchRecordManifest } from './lib/store.js'
import { validateManifestText } from './lib/validate.js'
import { draftAtom } from './lib/draft.js'

const out = {}
out.mode = process.env.DSH_ATOM_STORE_DIR ? `local:${process.env.DSH_ATOM_STORE_DIR}` : 'github index (default)'
const { records, error } = await openStore().load()
if (error) {
  out.storeError = error
} else {
  out.storeCount = records.length
  out.search = searchAtoms(records, { query: 'pdf', source: 'all', limit: 5 }).map((r) => ({
    id: r.id, intent: r.intent, tier: r.tier, source: r.repo,
  }))
  const rec = readAtom(records, 'pdf.extract_tables')
  if (rec) {
    const fm = await fetchRecordManifest(rec)
    out.read = fm.manifest ? { found: true, id: rec.id, tier: rec.tier, manifestKeys: Object.keys(fm.manifest) } : { found: false, error: fm.error }
  } else {
    out.read = { found: false }
  }
}
out.draft = draftAtom({ intent: '把金额换算成人民币', lang: 'python', tags: ['money'] })
console.log(JSON.stringify(out, null, 2))
