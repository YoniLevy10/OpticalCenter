import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { documentTypeLabel } from '../src/modules/documents/rules'
import { readHearingForm } from '../src/modules/documents/read-form'
import type { BranchCatalogRow } from '../src/modules/documents/branch-catalog'

const root = path.resolve(import.meta.dirname, '..')
const textDir = '/tmp/oc-pdfs'
const pdfDir =
  '/Users/levyyoni/.cursor/projects/Users-levyyoni-Documents-OpticalCenter-1/attachments/4da402fe-b904-467e-a8fd-4a77d05efb4a'
const publicDir = path.join(root, 'public', 'branch-files')

type Draft = BranchCatalogRow & { folder: string }

const rows: Draft[] = []
const usedNames = new Set<string>()
const usedIds = new Set<string>()

function uniqueId(base: string): string {
  let id = base
  let n = 2
  while (usedIds.has(id)) {
    id = `${base}-${n}`
    n += 1
  }
  usedIds.add(id)
  return id
}

for (const metaName of readdirSync(textDir).filter((name) => name.endsWith('.meta')).sort()) {
  const id = metaName.slice(0, -'.meta'.length)
  const header = readFileSync(path.join(textDir, metaName), 'utf8')
  const sourceName = header.match(/^FILE (.+)$/m)?.[1]
  if (!sourceName) continue
  const textPath = id.endsWith('.txt') ? id : `${id}.txt`
  const text = readFileSync(path.join(textDir, textPath), 'utf8')
  const form = readHearingForm(text)
  const folder = form.storeCode ?? 'review'
  const kind = form.kind ?? 'form'
  const stamp = form.expiry ?? 'nodate'
  let base = `${kind}-${stamp}`
  if (form.serial) base += `-${form.serial}`
  let fileName = `${base}.pdf`
  let n = 2
  while (usedNames.has(`${folder}/${fileName}`)) {
    fileName = `${base}-${n}.pdf`
    n += 1
  }
  usedNames.add(`${folder}/${fileName}`)
  const sourceUrl = `/branch-files/${folder}/${fileName}`
  const targetDir = path.join(publicDir, folder)
  mkdirSync(targetDir, { recursive: true })
  copyFileSync(path.join(pdfDir, sourceName), path.join(targetDir, fileName))
  const fileId = `branch-file-${folder}-${fileName.replace(/\.pdf$/, '')}`
  const summary = [
    form.storeCode ? `סניף ${form.storeCode} ${form.storeName ?? ''}`.trim() : 'סניף לא ודאי',
    form.kind ? documentTypeLabel(form.kind) : 'סוג לא זוהה',
    form.expiry ? `תוקף: ${form.expiry}` : 'תוקף: לא ברור',
    form.calibrationExpiry ? `כיול: ${form.calibrationExpiry}` : '',
    form.serial ? `מספר: ${form.serial}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const status = form.confident ? 'ingested' : 'needs_review'
  const primaryName = `${form.kind ? documentTypeLabel(form.kind) : 'מסמך'} ${form.expiry ?? ''}`.trim()
  rows.push({
    id: uniqueId(`branch-${folder}-${kind}-${stamp}${form.serial ? `-${form.serial}` : ''}`),
    fileId,
    storeCode: form.storeCode ?? '',
    storeName: form.storeName ?? '',
    kind: form.kind ?? 'hearing',
    expiry: form.expiry,
    sourceUrl,
    serial: form.serial,
    name: primaryName,
    summary,
    status,
    reason: form.reason,
    folder,
  })
  if (form.kind === 'hearing_booth' && form.calibrationExpiry && form.storeCode) {
    rows.push({
      id: uniqueId(
        `branch-${folder}-hearing_meter-${form.calibrationExpiry}${form.serial ? `-${form.serial}` : ''}`,
      ),
      fileId,
      storeCode: form.storeCode,
      storeName: form.storeName ?? '',
      kind: 'hearing_meter',
      expiry: form.calibrationExpiry,
      sourceUrl,
      serial: form.serial,
      name: `${documentTypeLabel('hearing_meter')} ${form.calibrationExpiry}`,
      summary,
      status: 'ingested',
      reason: null,
      folder,
    })
  }
}

const catalog: BranchCatalogRow[] = rows.map(({ folder: _folder, ...row }) => row)
writeFileSync(
  path.join(root, 'src/modules/documents/branch-catalog.json'),
  `${JSON.stringify(catalog, null, 2)}\n`,
)

const byFolder = new Map<string, number>()
for (const row of rows) {
  if (row.kind === 'hearing_meter' && row.id.includes('hearing_meter') && rows.some((other) => other.fileId === row.fileId && other.kind === 'hearing_booth')) {
    continue
  }
  byFolder.set(row.folder, (byFolder.get(row.folder) ?? 0) + 1)
}
const review = rows.filter((row) => row.folder === 'review' && row.kind !== 'hearing_meter')
console.log(`files ${byFolder.size} folders, catalog rows ${catalog.length}, review ${review.length}`)
for (const row of rows.filter((item) => item.folder === 'review' || item.status !== 'ingested')) {
  console.log('REVIEW', row.folder, row.kind, row.expiry, row.reason, row.name)
}
console.log('--- folders ---')
for (const [folder, count] of [...byFolder.entries()].sort()) {
  console.log(folder, count)
}
