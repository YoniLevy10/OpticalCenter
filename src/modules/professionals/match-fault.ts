export type FaultPro = {
  id: string
  full_name: string
  phone: string | null
  trade: string | null
  notes: string | null
  use_count: number
}

export type FaultProMatch = FaultPro & {
  score: number
  reason: string
}

const TRADE_HINTS: Record<string, string[]> = {
  hvac: ['מיזוג', 'מזגן', 'מזגנ', 'קירור', 'hvac'],
  electrical: ['חשמל', 'electric'],
  electrical_hazard: ['חשמל', 'electric'],
  plumbing: ['אינסטל', 'נזיל', 'plumbing'],
  security: ['אבטחה', 'מנעול', 'security', 'lock'],
  it: ['מחשב', 'קופה', 'רשת', 'it'],
  cleaning: ['ניקיון', 'cleaning'],
  other: ['כללי', 'general'],
}

/**
 * Rank saved professionals for one fault category.
 * Trade keyword hit beats a generic contact; frequent use breaks ties.
 */
export function matchProfessionalsForFault(
  professionals: FaultPro[],
  category: string,
): FaultProMatch[] {
  const hints = TRADE_HINTS[category] ?? TRADE_HINTS.other
  const scored: FaultProMatch[] = []
  for (const pro of professionals) {
    const trade = (pro.trade ?? '').toLowerCase()
    const hit = hints.find((hint) => trade.includes(hint.toLowerCase()))
    if (!hit && category !== 'other') continue
    const score = (hit ? 50 : 10) + Math.min(pro.use_count, 20)
    scored.push({
      ...pro,
      score,
      reason: hit ? `התאמה למקצוע · ${pro.trade}` : 'איש קשר כללי',
    })
  }
  return scored.sort(
    (a, b) => b.score - a.score || a.full_name.localeCompare(b.full_name, 'he'),
  )
}
