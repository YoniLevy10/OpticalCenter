/**
 * C04 — tech completion UX copy & gates.
 * Success means “sent for store approval”, never “closed”.
 */

export const TECH_COMPLETION = {
  treatmentLabel: 'סיכום טיפול',
  treatmentHint: 'מה בוצע בשטח — יוצג לחנות ולארי לפני אישור סגירה',
  treatmentPlaceholder: 'לדוגמה: הוחלף פילטר, נבדק זרימה, אין נזילה',
  proofLabel: 'הוכחת ביצוע (תמונה או וידאו)',
  proofHint: 'חובה לפני שליחה לאישור החנות',
  submitLabel: 'שלח לאישור החנות',
  submittingUpload: 'מעלה הוכחה…',
  submittingSave: 'שומר סיום…',
  /** Shown only after upload + server resolve both succeed. */
  successToast: 'נשלח לאישור החנות',
  successBanner: 'נשלח לאישור החנות',
  successBannerHint: 'החנות תאשר ב־WhatsApp. הסטטוס עדיין לא «נסגר».',
  sheetTitle: 'סיום עבודה',
  sheetDescription: 'סיכום טיפול + הוכחה — ואז שליחה לאישור החנות',
  startLabel: 'התחל טיפול',
  startSuccess: 'הטיפול התחיל',
  finishCta: 'סיימתי · שלח לאישור',
  minTreatmentChars: 8,
} as const

export function treatmentSummaryValid(text: string): boolean {
  return text.trim().length >= TECH_COMPLETION.minTreatmentChars
}

export type CompletionPhase =
  | 'idle'
  | 'uploading'
  | 'saving'
  | 'done'
  | 'error'

export function completionBusyLabel(phase: CompletionPhase): string | null {
  if (phase === 'uploading') return TECH_COMPLETION.submittingUpload
  if (phase === 'saving') return TECH_COMPLETION.submittingSave
  return null
}
