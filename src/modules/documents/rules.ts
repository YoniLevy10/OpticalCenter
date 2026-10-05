export type DocumentIntakeStatus = 'ingested' | 'needs_review' | 'failed'

export type StoreDocument = {
  id: string
  storeId: string
  storeCode: string
  storeName: string
  docType: string
  sourceUrl: string | null
  extractedExpiry: string | null
  computedNextCheck: string | null
  owner: string | null
  intakeStatus: DocumentIntakeStatus
  intakeReason: string | null
  version: number
  previousId: string | null
  renewed: boolean
  createdAt: string
  /** Set when the row is the file we created in Drive. */
  driveFileId?: string | null
  /** A person confirmed the store, expiry, or owner. Sync will not replace them. */
  fieldsLocked?: boolean
  localUpdatedAt?: string | null
}

export const DOCUMENT_TYPES = [
  { key: 'fire', label: 'כיבוי אש', cycleMonths: 12 },
  { key: 'electrical', label: 'חשמל', cycleMonths: 12 },
  { key: 'hearing', label: 'מערכות שמיעה — בדיקה שנתית', cycleMonths: 12 },
] as const

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) throw new Error('תאריך לא תקין')
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

export function documentClock(doc: StoreDocument): 'extracted' | 'computed' | 'missing' {
  if (doc.extractedExpiry) return 'extracted'
  if (doc.computedNextCheck) return 'computed'
  return 'missing'
}

export function isDocumentOverdue(doc: StoreDocument, now = new Date()): boolean {
  if (doc.renewed || doc.intakeStatus === 'failed') return false
  const due = doc.extractedExpiry || doc.computedNextCheck
  if (!due) return doc.intakeStatus === 'needs_review'
  return new Date(due).getTime() < now.getTime()
}

/** A renewal closes only after a new file is attached and marked ingested. */
export function renewDocument(
  current: StoreDocument,
  nextFile: { sourceUrl: string; extractedExpiry: string | null },
  now = new Date().toISOString(),
): { closed: StoreDocument; next: StoreDocument } {
  if (!nextFile.sourceUrl.trim()) {
    throw new Error('חידוש נסגר רק אחרי צירוף מסמך מעודכן')
  }
  const closed: StoreDocument = { ...current, renewed: true }
  const next: StoreDocument = {
    ...current,
    id: `${current.id}-v${current.version + 1}`,
    sourceUrl: nextFile.sourceUrl,
    extractedExpiry: nextFile.extractedExpiry,
    intakeStatus: nextFile.extractedExpiry ? 'ingested' : 'needs_review',
    intakeReason: nextFile.extractedExpiry ? null : 'תאריך התוקף לא ברור',
    version: current.version + 1,
    previousId: current.id,
    renewed: false,
    createdAt: now,
  }
  return { closed, next }
}
