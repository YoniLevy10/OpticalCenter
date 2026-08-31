export const TICKET_STATUSES = [
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_parts',
  'resolved',
  'closed',
  'cancelled',
] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

/** Human-facing status labels (novice-first). Internal keys unchanged. */
export const TICKET_STATUS_LABELS_HE: Record<TicketStatus, string> = {
  new: 'חדש',
  triaged: 'מחכה לטיפול',
  assigned: 'מחכה לטיפול',
  in_progress: 'בטיפול',
  waiting_parts: 'מחכה לחלק',
  resolved: 'הסתיים',
  closed: 'הסתיים',
  cancelled: 'בוטל',
}

export const TICKET_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const TICKET_PRIORITY_LABELS_HE: Record<TicketPriority, string> = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
}

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_parts',
]

export const TICKET_SOURCES = [
  'whatsapp',
  'qr_whatsapp',
  'nfc_whatsapp',
  'web_fallback',
  'demo',
] as const

export type TicketSourceLabel = (typeof TICKET_SOURCES)[number]

export const TICKET_SOURCE_LABELS_HE: Record<TicketSourceLabel, string> = {
  whatsapp: 'WhatsApp',
  qr_whatsapp: 'QR → WhatsApp',
  nfc_whatsapp: 'NFC → WhatsApp',
  web_fallback: 'טופס ווב',
  demo: 'הדגמה',
}

export const TICKET_CATEGORY_LABELS_HE: Record<string, string> = {
  hvac: 'מיזוג',
  electrical: 'חשמל',
  plumbing: 'אינסטלציה',
  security: 'אבטחה',
  it: 'מחשוב / קופה',
  cleaning: 'ניקיון',
  other: 'אחר',
}

export const TICKET_CATEGORIES = [
  'hvac',
  'electrical',
  'plumbing',
  'security',
  'it',
  'cleaning',
  'other',
] as const

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

/** Map classifier output to persisted ticket categories. */
export function normalizeTicketCategory(raw: string): TicketCategory {
  if (raw === 'electrical_hazard') return 'electrical'
  if ((TICKET_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as TicketCategory
  }
  return 'other'
}

export const TICKET_EVENT_LABELS_HE: Record<string, string> = {
  created: 'נוצרה',
  status_changed: 'שינוי סטטוס',
  assigned: 'שיוך טכנאי',
  sla_breached: 'זמן הטיפול שהוגדר עבר',
  tech_note: 'הערת טכנאי',
  tech_photo: 'תמונת טכנאי',
}


/** WhatsApp deep-link text that identifies a store (numeric code per country). */
export function storeWhatsAppPrefill(storeCode: string): string {
  return `STORE_${storeCode}`
}

export function parseStoreCodeFromText(text: string): string | null {
  const normalized = text.trim().toUpperCase()
  const storePrefixed = normalized.match(/\bSTORE[_\s-]?(\d{1,6})\b/)
  if (storePrefixed?.[1]) return storePrefixed[1]
  const bare = normalized.match(/^\s*(\d{1,6})\s*$/)
  if (bare?.[1]) return bare[1]
  const embedded = normalized.match(/(?:^|\s)(?:קוד\s*)?(\d{1,6})(?:\s|$)/)
  if (embedded?.[1] && normalized.length <= 40) return embedded[1]
  return null
}
