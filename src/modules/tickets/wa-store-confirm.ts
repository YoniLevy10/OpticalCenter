/**
 * WhatsApp-primary store confirmation helpers (pure — safe for unit tests).
 * Lifecycle "resolved" prompts the store to tap a button or reply מאשר;
 * «לא נפתר» returns the ticket to treatment. /store confirm remains a fallback.
 */

export const STORE_CONFIRM_BUTTON_PREFIX = 'store_confirm:'
export const STORE_REJECT_BUTTON_PREFIX = 'store_reject:'

function phonesMatchLocal(left: string, right: string): boolean {
  const norm = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.startsWith('972')) return digits.slice(3).replace(/^0/, '')
    return digits.replace(/^0/, '')
  }
  const a = norm(left)
  const b = norm(right)
  return Boolean(a) && a === b
}

export function storeConfirmButtonId(ticketId: string): string {
  return `${STORE_CONFIRM_BUTTON_PREFIX}${ticketId}`
}

export function storeRejectButtonId(ticketId: string): string {
  return `${STORE_REJECT_BUTTON_PREFIX}${ticketId}`
}

/** Parse interactive button id → ticket UUID, or null. */
export function parseStoreConfirmButtonId(
  interactiveId: string | null | undefined,
): string | null {
  if (!interactiveId) return null
  const raw = interactiveId.trim()
  if (!raw.startsWith(STORE_CONFIRM_BUTTON_PREFIX)) return null
  const ticketId = raw.slice(STORE_CONFIRM_BUTTON_PREFIX.length).trim()
  return ticketId || null
}

export function parseStoreRejectButtonId(
  interactiveId: string | null | undefined,
): string | null {
  if (!interactiveId) return null
  const raw = interactiveId.trim()
  if (!raw.startsWith(STORE_REJECT_BUTTON_PREFIX)) return null
  const ticketId = raw.slice(STORE_REJECT_BUTTON_PREFIX.length).trim()
  return ticketId || null
}

function normalizeConfirmText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .trim()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Free-text confirm intent from a store reporter.
 * Intentionally stricter than desk "לאשר" so thanks alone still go through
 * non-issue ack when nothing is awaiting confirm.
 */
export function isStoreConfirmReply(text: string | null | undefined): boolean {
  const t = normalizeConfirmText(text)
  if (!t || t.length > 48) return false

  if (
    /^(?:מאשר(?:ת)?(?:\s+תיקון)?|אושר|אישור(?:\s+תיקון)?|הבעיה נפתרה|נפתר(?:ה)?|תוקן|תקין|הכל תקין|הכול תקין)$/i.test(
      t,
    )
  ) {
    return true
  }
  // "תודה תוקן" / "תודה, הכל בסדר" after a resolved ticket — treat as confirm
  // when the intake layer already found a resolved ticket for this reporter.
  if (
    /^(?:תודה(?:\s+רבה)?(?:\s+לך)?)?\s*(?:תוקן|הכל בסדר|הכול בסדר|הכל תקין|הכול תקין)$/i.test(
      t,
    )
  ) {
    return true
  }
  return false
}

/** Free-text «not fixed» — returns ticket to treatment (not a close). */
export function isStoreRejectReply(text: string | null | undefined): boolean {
  const t = normalizeConfirmText(text)
  if (!t || t.length > 64) return false
  return /^(?:לא\s*נפתר(?:ה)?|לא\s*תוקן|עדיין\s*לא\s*נפתר(?:ה)?|עדיין\s*תקול|לא\s*אושר|לא\s*תקין|הבעיה\s*נמשכת|עדיין\s*יש\s*תקלה)$/i.test(
    t,
  )
}

/** Sender matches the ticket reporter phone (E.164 / local variants). */
export function reporterPhoneMatches(
  waId: string,
  reporterPhone: string | null | undefined,
): boolean {
  if (!reporterPhone?.trim()) return false
  return phonesMatchLocal(waId, reporterPhone)
}

export function formatAwaitingConfirmChoice(
  tickets: Array<{ display: string }>,
): string {
  const lines = tickets.map((t, i) => `${i + 1}. ${t.display}`)
  return [
    'יש יותר מתקלה אחת שממתינה לאישור מהחנות:',
    ...lines,
    'לחצו «אשר תיקון» או «לא נפתר» בהודעה של התקלה הספציפית — לא ניתן לאשר לפי ההודעה האחרונה בלבד.',
  ].join('\n')
}

export const STORE_CONFIRM_BUTTON_TITLE = 'אשר תיקון'
export const STORE_REJECT_BUTTON_TITLE = 'לא נפתר'

export const STORE_CONFIRM_WA_HINT =
  'אשרו בלחיצה על «אשר תיקון» או השיבו «מאשר». אם לא נפתר — «לא נפתר».'
