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
  { test: /כיבוי|אש|fire/i, docType: 'fire' },
  { test: /חשמל|electric/i, docType: 'electrical' },
  { test: /שמיעה|hearing/i, docType: 'hearing' },
  { test: /מלאי|inventory|stock/i, docType: 'inventory' },
]

export function identifyFile(name: string, mime: string): string | null {
  const hay = `${name} ${mime}`
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
}): IngestedFile {
  const docType = identifyFile(input.name, input.mime)
  const text = input.extractedText?.trim() || null
  const hinted = input.storeCodeHint?.trim() || null
  const storeKnown = hinted ? input.knownStoreCodes.includes(hinted) : false
  const duplicate = input.existingNames.includes(input.name)

  let status: IngestedFile['status'] = 'ingested'
  let reason: string | null = null
  if (!docType) {
    status = 'needs_review'
    reason = 'סוג הקובץ לא זוהה'
  } else if (!text) {
    status = 'needs_review'
    reason = 'לא חולץ טקסט מהקובץ'
  } else if (!hinted || !storeKnown) {
    status = 'needs_review'
    reason = 'השיוך לסניף לא ודאי'
  }

  return {
    id: input.id,
    name: input.name,
    mime: input.mime,
    sourceUrl: input.sourceUrl ?? null,
    stage: 'validate',
    docType,
    storeCode: storeKnown ? hinted : null,
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
