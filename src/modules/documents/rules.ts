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
  /** WhatsApp sender to answer after Ari decides. */
  originWaId?: string | null
}

/** Days before due date when month-ahead reminders fire (≈1 calendar month). */
export const DOCUMENT_REMINDER_DAYS_AHEAD = 30

export type DocumentTypeDef = {
  key: string
  label: string
  cycleMonths: number
  /** When true, cron + ops UI surface a month-ahead reminder. */
  monthAheadReminder?: boolean
  /** Hearing calibration family (כיול א/ב/ג). */
  hearingCalibration?: boolean
}

/**
 * C08 — hearing calibrations ×3 (Ari-approved placeholders):
 * כיול א · כיול ב · כיול ג. Annual cycle + month-ahead reminder.
 * Legacy `hearing` kept for existing rows / Drive ingest.
 */
export const DOCUMENT_TYPES: readonly DocumentTypeDef[] = [
  { key: 'fire', label: 'כיבוי אש', cycleMonths: 12 },
  { key: 'electrical', label: 'חשמל', cycleMonths: 12 },
  {
    key: 'hearing_a',
    label: 'כיול א',
    cycleMonths: 12,
    monthAheadReminder: true,
    hearingCalibration: true,
  },
  {
    key: 'hearing_b',
    label: 'כיול ב',
    cycleMonths: 12,
    monthAheadReminder: true,
    hearingCalibration: true,
  },
  {
    key: 'hearing_c',
    label: 'כיול ג',
    cycleMonths: 12,
    monthAheadReminder: true,
    hearingCalibration: true,
  },
  /**
   * Legacy single annual hearing check — still readable in UI;
   * new docs should use hearing_a / hearing_b / hearing_c.
   */
  {
    key: 'hearing',
    label: 'מערכות שמיעה — בדיקה שנתית (ישן)',
    cycleMonths: 12,
    monthAheadReminder: true,
    hearingCalibration: true,
  },
] as const

const TYPE_BY_KEY = new Map(DOCUMENT_TYPES.map((row) => [row.key, row]))

export function documentTypeDef(docType: string): DocumentTypeDef | undefined {
  return TYPE_BY_KEY.get(docType)
}

export function documentTypeLabel(docType: string): string {
  return documentTypeDef(docType)?.label ?? docType
}

export function isHearingCalibrationType(docType: string): boolean {
  return Boolean(documentTypeDef(docType)?.hearingCalibration)
}

/** Selectable types for new manual documents (exclude legacy `hearing`). */
export function selectableDocumentTypes(): DocumentTypeDef[] {
  return DOCUMENT_TYPES.filter((row) => row.key !== 'hearing')
}

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

export function documentDueAt(doc: StoreDocument): string | null {
  return doc.extractedExpiry || doc.computedNextCheck || null
}

export function isDocumentOverdue(doc: StoreDocument, now = new Date()): boolean {
  if (doc.renewed || doc.intakeStatus === 'failed') return false
  const due = documentDueAt(doc)
  if (!due) return doc.intakeStatus === 'needs_review'
  return new Date(due).getTime() < now.getTime()
}

/**
 * Month-ahead window: due within DOCUMENT_REMINDER_DAYS_AHEAD and not yet overdue.
 * Applies to types with `monthAheadReminder` (hearing calibrations).
 */
export function isDocumentDueSoon(doc: StoreDocument, now = new Date()): boolean {
  if (doc.renewed || doc.intakeStatus === 'failed') return false
  if (isDocumentOverdue(doc, now)) return false
  const def = documentTypeDef(doc.docType)
  if (!def?.monthAheadReminder) return false
  const due = documentDueAt(doc)
  if (!due) return false
  const dueMs = new Date(due).getTime()
  if (Number.isNaN(dueMs)) return false
  const msAhead = dueMs - now.getTime()
  if (msAhead < 0) return false
  return msAhead <= DOCUMENT_REMINDER_DAYS_AHEAD * 24 * 60 * 60 * 1000
}

export function documentNeedsReminder(doc: StoreDocument, now = new Date()): boolean {
  return isDocumentOverdue(doc, now) || isDocumentDueSoon(doc, now)
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
