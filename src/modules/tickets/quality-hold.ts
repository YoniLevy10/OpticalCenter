/** B03 — 30-day quality hold after resolve, before final close. */

export const QUALITY_HOLD_DAYS = 30

export const QUALITY_HOLD_ACTIVE_HE = 'בהחזקת איכות — סגירה סופית אחרי 30 יום'
export const QUALITY_HOLD_BLOCK_CLOSE_HE =
  'לא ניתן לסגור סופית לפני תום החזקת האיכות (30 יום). חריגה דורשת אישור ארי.'
export const QUALITY_HOLD_OVERRIDE_REASON_REQUIRED_HE =
  'נדרשת סיבת חריגה לסגירה לפני תום החזקת האיכות'

export function qualityHoldUntilFrom(
  startedAt: Date | string = new Date(),
  days = QUALITY_HOLD_DAYS,
): Date {
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt
  const until = new Date(start.getTime())
  until.setUTCDate(until.getUTCDate() + days)
  return until
}

export function isQualityHoldActive(
  holdUntil: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!holdUntil) return false
  const until = typeof holdUntil === 'string' ? new Date(holdUntil) : holdUntil
  if (Number.isNaN(until.getTime())) return false
  return until.getTime() > now.getTime()
}

export function formatQualityHoldHe(
  holdUntil: string | Date | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!holdUntil) return null
  const until = typeof holdUntil === 'string' ? new Date(holdUntil) : holdUntil
  if (Number.isNaN(until.getTime())) return null
  if (until.getTime() <= now.getTime()) return 'החזקת האיכות הסתיימה — ניתן לסגור סופית'
  const daysLeft = Math.max(
    1,
    Math.ceil((until.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
  )
  const dateLabel = until.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  })
  return `החזקת איכות · נותרו ${daysLeft} ימים (עד ${dateLabel})`
}
