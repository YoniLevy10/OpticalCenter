export type DocumentIntakeStatus = 'ingested' | 'needs_review' | 'failed'

export type StoreDocument = {
  id: string
  storeId: string
  storeCode: string
  storeName: string
  docType: string
  sourceUrl: string | null
  /** Private store-documents path. The file itself, not the mail that carried it. */
  storagePath?: string | null
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
  /** Hand-set reminder dates. Empty falls back to six months and two months before expiry. */
  reminderSixAt?: string | null
  reminderTwoAt?: string | null
  /** Name Ari typed. Wins over the file name and the document type. */
  title?: string | null
}

const DOCUMENT_TITLE_MAX = 80

/** Blank clears the hand-set name. Extra spaces collapse. */
export function cleanDocumentTitle(value: string): string | null {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  if (clean.length > DOCUMENT_TITLE_MAX) throw new Error('השם ארוך מדי')
  return clean
}

/** Days before due date when month-ahead reminders fire (≈1 calendar month). */
export const DOCUMENT_REMINDER_DAYS_AHEAD = 30

export type DocumentTypeDef = {
  key: string
  label: string
  cycleMonths: number
  /** When true, cron + ops UI surface a month-ahead reminder. */
  monthAheadReminder?: boolean
  /** Hearing calibration family (טימפנומטר / אודיומטר / תא אקוסטי). */
  hearingCalibration?: boolean
}

/**
 * Hearing calibrations Ari defined for every hearing store:
 * hearing_a טימפנומטר — 12 months
 * hearing_b אודיומטר — 12 months
 * hearing_c תא אקוסטי — 24 months
 * Keys stay hearing_a/b/c so existing rows keep their type.
 * Legacy `hearing` stays readable for older rows.
 */
export const DOCUMENT_TYPES: readonly DocumentTypeDef[] = [
  { key: 'fire', label: 'כיבוי אש', cycleMonths: 12 },
  { key: 'electrical', label: 'חשמל', cycleMonths: 12 },
  {
    key: 'hearing_a',
    label: 'טימפנומטר',
    cycleMonths: 12,
    monthAheadReminder: true,
    hearingCalibration: true,
  },
  {
    key: 'hearing_b',
    label: 'אודיומטר',
    cycleMonths: 12,
    monthAheadReminder: true,
    hearingCalibration: true,
  },
  {
    key: 'hearing_c',
    label: 'תא אקוסטי',
    cycleMonths: 24,
    monthAheadReminder: true,
    hearingCalibration: true,
  },
  { key: 'hearing_booth', label: 'תא שמיעה', cycleMonths: 24 },
  { key: 'hearing_meter', label: 'כיול אודיומטר', cycleMonths: 12 },
  { key: 'hearing_tymp', label: 'טימפנומטר', cycleMonths: 12 },
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

export type DocumentReminder = {
  months: 6 | 2
  label: string
  at: string
}

/** Two reminders on every dated document: half a year before, then two months before. */
export function documentReminders(expiryIso: string): DocumentReminder[] {
  return [
    { months: 6, label: 'חצי שנה לפני', at: shiftMonthsUtc(expiryIso, -6) },
    { months: 2, label: 'חודשיים לפני', at: shiftMonthsUtc(expiryIso, -2) },
  ]
}

/** Computed reminders, replaced when someone edited a date on the card. */
export function remindersFor(doc: StoreDocument): DocumentReminder[] {
  const due = documentDueAt(doc)
  const defaults = due ? documentReminders(due) : []
  const six = doc.reminderSixAt || defaults.find((row) => row.months === 6)?.at
  const two = doc.reminderTwoAt || defaults.find((row) => row.months === 2)?.at
  const rows: DocumentReminder[] = []
  if (six) rows.push({ months: 6, label: 'חצי שנה לפני', at: six })
  if (two) rows.push({ months: 2, label: 'חודשיים לפני', at: two })
  return rows
}

/** Which reminder has arrived, while the document itself is not yet overdue. */
export function documentReminderStage(
  doc: StoreDocument,
  now = new Date(),
): 'six' | 'two' | null {
  const due = documentDueAt(doc)
  if (doc.renewed || doc.intakeStatus === 'failed') return null
  if (due && isDocumentOverdue(doc, now)) return null
  const rows = remindersFor(doc)
  const nowMs = now.getTime()
  const two = rows.find((row) => row.months === 2)
  const six = rows.find((row) => row.months === 6)
  if (two && nowMs >= new Date(two.at).getTime()) return 'two'
  if (six && nowMs >= new Date(six.at).getTime()) return 'six'
  return null
}

function shiftMonthsUtc(iso: string, months: number): string {
  const date = new Date(iso)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return date.toISOString()
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
