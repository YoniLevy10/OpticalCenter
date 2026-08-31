/**
 * Detect short acknowledgements / gratitude that must not open a new ticket.
 * Used after a completed intake so "תודה רבה" does not restart the bot.
 */

const EXACT_ACKS = new Set([
  'תודה',
  'תודה רבה',
  'תודו',
  'תודה לך',
  'תודה רבה לך',
  'רב תודות',
  'תודה תוקן',
  'thanks',
  'thank you',
  'thank u',
  'thx',
  'ty',
  'בסדר',
  'אוקיי',
  'אוקי',
  'ok',
  'okay',
  'מעולה',
  'יופי',
  'סבבה',
  'מצוין',
  'נהדר',
  'קיבלתי',
  'הבנתי',
  'סגור',
  'אין בעיה',
  'הכל בסדר',
  'הכול בסדר',
])

function normalizeAckText(text: string): string {
  return text
    .trim()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** True when the message is only thanks / OK / short ack — not a fault report. */
export function isNonIssueAck(text: string | null | undefined): boolean {
  if (!text) return false
  const t = normalizeAckText(text)
  if (!t) return false
  // Longer messages may contain a real issue after a polite opener.
  if (t.length > 48) return false
  if (EXACT_ACKS.has(t)) return true
  if (/^(תודה|thanks|thank you|thx)(\s+(רבה|לך|you|u))*(\s+(רבה|לך))*?$/i.test(t)) {
    return true
  }
  // "תודה על הטיפול" / "תודה שטיפלתם" — gratitude without a new fault.
  // Note: avoid \b — unreliable with Hebrew.
  if (
    t.length <= 40 &&
    /^(תודה|thanks|thank you|thx)(\s|$)/.test(t) &&
    !/(תקלה|נזילה|מזגן|שבור|לא עובד|סתימה|דלת|חשמל|בעיה|ניקוז)/.test(t)
  ) {
    return true
  }
  return false
}
