/**
 * WhatsApp-primary store confirmation helpers (pure — safe for unit tests).
 * Lifecycle "resolved" prompts the store to tap a button or reply מאשר;
 * /store confirm remains a secondary fallback.
 */

export const STORE_CONFIRM_BUTTON_PREFIX = 'store_confirm:'

export function storeConfirmButtonId(ticketId: string): string {
  return `${STORE_CONFIRM_BUTTON_PREFIX}${ticketId}`
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

/**
 * Free-text confirm intent from a store reporter.
 * Intentionally stricter than desk "לאשר" so thanks alone still go through
 * non-issue ack when nothing is awaiting confirm.
 */
export function isStoreConfirmReply(text: string | null | undefined): boolean {
  if (!text) return false
  const t = text
    .trim()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

export const STORE_CONFIRM_BUTTON_TITLE = 'אשר תיקון'

export const STORE_CONFIRM_WA_HINT =
  'אשרו בלחיצה על הכפתור או השיבו «מאשר» בוואטסאפ.'
