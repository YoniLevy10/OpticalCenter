import {
  findCalibrations,
  matchStoreFromLabel,
  splitCalibrations,
  type StoreNameRef,
} from '@/modules/documents/calibrations'
import { readHearingForm } from '@/modules/documents/read-form'

export type IngestStage = 'identify' | 'extract' | 'assign' | 'validate'

export type IngestedFile = {
  id: string
  name: string
  mime: string
  sourceUrl: string | null
  stage: IngestStage
  docType: string | null
  storeCode: string | null
  extractedText: string | null
  status: 'ingested' | 'needs_review' | 'failed'
  reason: string | null
  versionOf: string | null
  deletedInSource: boolean
  driveFileId: string | null
  driveModifiedTime: string | null
  /** Who last owns the bytes. His file is never overwritten. */
  origin: 'drive' | 'maintainos' | null
  localUpdatedAt: string | null
}

const TYPE_HINTS: { test: RegExp; docType: string }[] = [
  // אש must not match inside אשדוד / אשקלון.
  { test: /כיבוי|(?<![\u0590-\u05FF])אש(?![\u0590-\u05FF])|fire/i, docType: 'fire' },
  { test: /חשמל|electric/i, docType: 'electrical' },
  { test: /שמיעה|hearing/i, docType: 'hearing' },
  { test: /מלאי|inventory|stock/i, docType: 'inventory' },
]

export function identifyFile(name: string, mime: string, text?: string | null): string | null {
  const calibrations = findCalibrations(`${name} ${mime}`, text)
  if (calibrations.length === 1) return calibrations[0]
  if (calibrations.length > 1) return null
  if (text?.trim()) {
    const kind = readHearingForm(text).kind
    if (kind) return kind
  }
  const hay = `${name} ${text ?? ''} ${mime}`
  return TYPE_HINTS.find((hint) => hint.test.test(hay))?.docType ?? null
}

export function runIngestPipeline(input: {
  id: string
  name: string
  mime: string
  sourceUrl?: string | null
  storeCodeHint?: string | null
  extractedText?: string | null
  knownStoreCodes: string[]
  existingNames: string[]
  /** When set, a Hebrew city or branch in the filename can assign the store. */
  stores?: readonly StoreNameRef[]
}): IngestedFile {
  const text = input.extractedText?.trim() || null
  const slices = splitCalibrations(input.name, text)
  const read = text ? readHearingForm(text) : null
  const docType =
    slices.length === 1
      ? slices[0].docType
      : slices.length > 1
        ? null
        : identifyFile(input.name, input.mime, text)
  const hinted = input.storeCodeHint?.trim() || (read?.confident ? read.storeCode : null) || null
  const storeKnown = hinted ? input.knownStoreCodes.includes(hinted) : false
  const named =
    !storeKnown && input.stores?.length ? matchStoreFromLabel(input.name, input.stores) : null
  const storeCode = storeKnown ? hinted : named?.code ?? null
  const duplicate = input.existingNames.includes(input.name)

  let status: IngestedFile['status'] = 'ingested'
  let reason: string | null = null
  if (!docType && slices.length === 0) {
    status = 'needs_review'
    reason = 'סוג הקובץ לא זוהה'
  } else if (!storeCode) {
    status = 'needs_review'
    reason = 'השיוך לסניף לא ודאי'
  } else if (!text) {
    status = 'needs_review'
    reason = 'לא חולץ טקסט מהקובץ'
  } else if (slices.length > 1) {
    status = 'needs_review'
    reason = 'המסמך כולל כמה כיולים'
  }

  return {
    id: input.id,
    name: input.name,
    mime: input.mime,
    sourceUrl: input.sourceUrl ?? null,
    stage: 'validate',
    docType,
    storeCode,
    extractedText: text,
    status,
    reason,
    versionOf: duplicate ? input.name : null,
    deletedInSource: false,
    driveFileId: null,
    driveModifiedTime: null,
    origin: null,
    localUpdatedAt: null,
  }
}

/** A Drive delete marks the file; it does not erase history. */
export function markSourceDeleted(file: IngestedFile): IngestedFile {
  return {
    ...file,
    deletedInSource: true,
    status: 'needs_review',
    reason: 'הקובץ נמחק או הועבר בדרייב',
  }
}
