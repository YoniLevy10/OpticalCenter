/**
 * Technician assign SMS (019) — short, actionable Hebrew.
 * Keep under ~2 SMS segments when possible (Hebrew UCS-2).
 */
export function buildTechnicianAssignedSms(input: {
  displayNumber: string
  storeName: string
  link: string
}): string {
  const display = input.displayNumber.trim()
  const store = input.storeName.trim() || 'חנות'
  const link = input.link.trim()
  const title = display ? `תקלה ${display}` : 'תקלה'
  return [
    `שיוך חדש · ${title}`,
    store,
    'לטיפול בטלפון:',
    link,
  ].join('\n')
}

/**
 * 019 `source` / SMS_019_SENDER constraints (official API):
 * max 11 chars, English letters + digits only (no Hebrew, spaces, or +).
 * Closest branded form of «מוקד Optical Center».
 */
export const RECOMMENDED_SMS_019_SENDER = 'OpticalCtr'
