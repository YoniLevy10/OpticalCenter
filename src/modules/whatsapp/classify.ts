import { parseStoreCodeFromText } from '@/modules/tickets/constants'
import { canonicalStoreCode } from '@/modules/stores/israel-stores'
import { deskDecisionPhones } from '@/lib/data/ops-ledger'

const MONEY = /שקל|₪|הצעת מחיר|תשלום|חשבונית|הזמנ|invoice|\bquote\b|\bfacture\b|\bdevis\b|paiement|€/

export type InboundClass = 'fault' | 'money' | 'document' | 'multi'

export type DeskDecision = 'approved' | 'rejected' | 'needs_info'

/** Fault stays on the ticket path. Money, a file, or several items do not. */
export function classifyInbound(input: {
  text: string | null
  mediaKind: 'image' | 'video' | 'document' | 'audio' | null
}): InboundClass {
  if (input.mediaKind === 'document') return 'document'
  const text = input.text?.trim() || ''
  if (!text) return 'fault'
  // A voice note with two faults stays on the ticket path. Money still leaves it.
  if (input.mediaKind === 'audio' && !MONEY.test(text)) return 'fault'
  if (/וגם\s+|ועוד\s+/.test(text)) return 'multi'
  if (MONEY.test(text)) return 'money'
  return 'fault'
}

export function parseMoneyAmount(text: string): number | null {
  const patterns = [
    /₪\s*([\d][\d,]*(?:\.\d+)?)/,
    /([\d][\d,]*(?:\.\d+)?)\s*(?:₪|שקל)/,
    /€\s*([\d][\d,]*(?:\.\d+)?)/,
    /([\d][\d,]*(?:\.\d+)?)\s*€/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const amount = Number(match[1].replace(/,/g, ''))
    if (Number.isFinite(amount) && amount > 0) return amount
  }
  return null
}

/** "נזילה וגם המזגן" → two fault texts. Money in either part stays one message. */
export function splitSpokenFaults(text: string): string[] {
  const trimmed = text.trim()
  const parts = trimmed
    .split(/\s+וגם\s+|\s+ועוד\s+|\s+and also\s+|\s+et aussi\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
  if (parts.length < 2) return trimmed ? [trimmed] : []
  if (parts.some((part) => MONEY.test(part))) return [trimmed]
  return parts
}

/** Prefer "סניף 6018" so a shekel amount is not read as the store code. */
export function storeCodeFromText(text: string | null): string | null {
  if (!text) return null
  const named = text.match(/סניף\s+([0-9]{2,6})/)
  if (named?.[1]) return canonicalStoreCode(named[1])
  const parsed = parseStoreCodeFromText(text)
  return parsed ? canonicalStoreCode(parsed) : null
}

export function phonesMatch(left: string, right: string): boolean {
  const norm = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.startsWith('972')) return digits.slice(3).replace(/^0/, '')
    return digits.replace(/^0/, '')
  }
  const a = norm(left)
  const b = norm(right)
  return Boolean(a) && a === b
}

export function isAriSender(waId: string): boolean {
  return deskDecisionPhones().some((phone) => phonesMatch(waId, phone))
}

/** The same three words work as a button title or as free text. */
export function parseDeskDecision(text: string | null): DeskDecision | null {
  const value = text?.trim() || ''
  if (!value) return null
  if (/לבקש מידע|צריך פרטים|מידע נוסף/.test(value)) return 'needs_info'
  if (/לדחות|נדחה/.test(value)) return 'rejected'
  if (/(?:^|\s)(?:לאשר|מאשר)(?:\s|$)|^(?:לאשר|מאשר)$/.test(value)) return 'approved'
  return null
}
