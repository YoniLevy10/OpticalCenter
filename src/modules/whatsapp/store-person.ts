export type StorePersonClaim = {
  name: string
  phone: string
  category: string
  trade: string
}

const TRADES: Array<{ word: string; category: string; trade: string }> = [
  { word: 'מיזוג', category: 'hvac', trade: 'מיזוג' },
  { word: 'מזגן', category: 'hvac', trade: 'מיזוג' },
  { word: 'חשמל', category: 'electrical', trade: 'חשמל' },
  { word: 'נזיל', category: 'plumbing', trade: 'נזילות' },
  { word: 'אינסטל', category: 'plumbing', trade: 'נזילות' },
  { word: 'מנעול', category: 'security', trade: 'מנעול' },
  { word: 'ניקיון', category: 'cleaning', trade: 'ניקיון' },
  { word: 'מחשב', category: 'it', trade: 'מחשוב' },
]

/** "האיש שלי למיזוג דני 0521234567" — the manager names their own person. */
export function parseStorePerson(text: string): StorePersonClaim | null {
  const raw = text.trim()
  if (!/איש|טכנאי|בעל מקצוע/.test(raw)) return null
  const phoneMatch = raw.match(/(?:\+?972[-\s]?|0)?5\d[-\s]?\d{3}[-\s]?\d{4}/)
  if (!phoneMatch || phoneMatch.index == null) return null
  const trade = TRADES.find((row) => raw.includes(row.word))
  if (!trade) return null
  const name = raw
    .slice(0, phoneMatch.index)
    .match(/([א-ת]{2,})\s*$/)?.[1]
  if (!name || TRADES.some((row) => row.word === name)) return null
  return {
    name,
    phone: phoneMatch[0].replace(/\D/g, ''),
    category: trade.category,
    trade: trade.trade,
  }
}

export function storePersonNote(storeCode: string, category: string): string {
  return `store:${storeCode} category:${category}`
}

/** Keep earlier store marks so one person can stay in the shared book for more than one branch. */
export function mergeStorePersonNote(
  existing: string | null,
  storeCode: string,
  category: string,
): string {
  const mark = storePersonNote(storeCode, category)
  const base = (existing ?? '').trim()
  if (!base) return mark
  if (base.includes(mark)) return base
  return `${base}\n${mark}`
}

export function personForStore(
  people: Array<{ full_name: string; phone: string | null; notes: string | null }>,
  storeCode: string,
  category: string,
): { name: string; phone: string } | null {
  const mark = storePersonNote(storeCode, category)
  const hit = people.find((person) => person.phone && (person.notes ?? '').includes(mark))
  if (!hit?.phone) return null
  return { name: hit.full_name, phone: hit.phone }
}

export function faultsSms(storeName: string, lines: string[]): string {
  const body = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 4)
  return `Optical Center ${storeName}: ביקור אחד. ${body.join('. ')}`.slice(0, 300)
}
