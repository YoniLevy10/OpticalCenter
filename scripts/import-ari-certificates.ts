/**
 * Classify Ari's calibration PDFs (filename + optional extracted text)
 * into store_documents rows. Prints JSON. Does not write to the database.
 *
 * Usage: npx tsx --tsconfig tsconfig.json scripts/import-ari-certificates.ts <manifest.json>
 * manifest: [{ "filename": "...", "text": "..." | null }]
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  calibrationIntake,
  matchStoreFromLabel,
  splitCalibrations,
  unclassifiedCertificateLabel,
} from '@/modules/documents/calibrations'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'

type ManifestItem = { filename: string; text?: string | null }

const stores = ISRAEL_STORES.map((store) => ({
  code: store.code,
  name: store.name,
  city: store.city,
}))

function idFor(filename: string, docType: string): string {
  const hash = createHash('sha256').update(`${filename}\n${docType}`).digest('hex').slice(0, 24)
  return `ari-cert-${hash}`
}

function fileId(filename: string): string {
  const hash = createHash('sha256').update(filename).digest('hex').slice(0, 24)
  return `ari-file-${hash}`
}

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8')) as ManifestItem[]
const documents: {
  clientId: string
  filename: string
  docType: string
  storeCode: string | null
  expiry: string | null
  intakeStatus: 'ingested' | 'needs_review'
  intakeReason: string | null
}[] = []
const files: {
  clientId: string
  filename: string
  docType: string | null
  storeCode: string | null
  status: 'needs_review'
  reason: string
}[] = []

for (const item of manifest) {
  const text = item.text?.trim() || null
  const match = matchStoreFromLabel(item.filename, stores)
  const slices = splitCalibrations(item.filename, text)
  if (slices.length > 0) {
    for (const slice of slices) {
      const intake = calibrationIntake(slice, match.code)
      documents.push({
        clientId: idFor(item.filename, slice.docType),
        filename: item.filename,
        docType: slice.docType,
        storeCode: match.code,
        expiry: slice.expiry,
        intakeStatus: intake.intakeStatus,
        intakeReason: intake.intakeReason,
      })
    }
    const first = documents[documents.length - slices.length]
    files.push({
      clientId: fileId(item.filename),
      filename: item.filename,
      docType: slices.length === 1 ? slices[0].docType : null,
      storeCode: match.code,
      status: 'needs_review',
      reason: first.intakeReason ?? (slices.length > 1 ? 'המסמך כולל כמה כיולים' : 'נקלט'),
    })
    continue
  }
  const label = unclassifiedCertificateLabel(item.filename, text) ?? item.filename.replace(/\.pdf$/i, '')
  const reason = match.code
    ? 'סוג הכיול לא זוהה — ייתכן אישור שמכסה כמה כיולים'
    : 'השיוך לסניף לא ודאי'
  documents.push({
    clientId: idFor(item.filename, label),
    filename: item.filename,
    docType: label,
    storeCode: match.code,
    expiry: null,
    intakeStatus: 'needs_review',
    intakeReason: reason,
  })
  files.push({
    clientId: fileId(item.filename),
    filename: item.filename,
    docType: null,
    storeCode: match.code,
    status: 'needs_review',
    reason,
  })
}

process.stdout.write(JSON.stringify({ documents, files }))
