/** Pull a locked price, the phone Ari called, and a name out of a WhatsApp line. */
export function parseEngagementApproval(text: string): {
  amount: number | null
  phone: string | null
  name: string | null
} {
  const phoneMatch = text.match(/(?:\+?972-?|0)5\d-?\d{3}-?\d{4}/)
  const phone = phoneMatch?.[0]?.replace(/[^\d+]/g, '') ?? null
  let rest = phoneMatch?.[0] ? text.replace(phoneMatch[0], ' ') : text
  rest = rest.replace(/לאשר|מאשר|לדחות|נדחה|לבקש מידע/g, ' ')
  rest = rest.replace(/(^|\s)אשר(\s|$)/g, ' ')
  const amountMatch = rest.match(/(?:₪\s*)?(\d{2,6})(?:\s*(?:₪|שקל))?/)
  const amount = amountMatch ? Number(amountMatch[1]) : null
  const name =
    rest
      .replace(/\d+/g, ' ')
      .replace(/[^\p{L}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 1)
      .slice(0, 3)
      .join(' ') || null
  return {
    amount: amount != null && amount > 0 ? amount : null,
    phone,
    name,
  }
}
