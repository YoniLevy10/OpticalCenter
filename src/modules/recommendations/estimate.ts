import { normalizeTicketCategory } from '@/modules/tickets/constants'
import { parseBundleScope } from '@/modules/recommendations/commit'
import {
  formatIls,
  spendAmountForTrueCost,
  spendsContributeToTrueCost,
} from '@/modules/spend/true-cost'
import type { SpendRequest } from '@/modules/spend/policy'
import type { VendorOutcome } from '@/modules/vendors/outcomes'

export type CostBand = { low: number; high: number }

/** The amount written on this fault. Other faults' quotes are not borrowed. */
export function recordedTicketAmount(spends: SpendRequest[], ticketId: string): number | null {
  const rows = spends.filter(
    (spend) =>
      spend.ticketId === ticketId &&
      !parseBundleScope(spend.scope) &&
      spendsContributeToTrueCost(spend),
  )
  if (rows.length === 0) return null
  const ranked = [...rows].sort((a, b) => rankRecorded(b) - rankRecorded(a))
  const amount = spendAmountForTrueCost(ranked[0]!)
  return amount > 0 ? Math.round(amount) : null
}

function rankRecorded(spend: SpendRequest): number {
  if (spend.actualAmount != null) return 2
  if (spend.status === 'approved') return 1
  return 0
}

export function formatRecordedAmount(amount: number | null): string {
  if (amount == null) return 'אין עדיין מחיר'
  return formatIls(amount)
}

/** Recorded prices only. A single sample stays a point, not an invented spread. */
export function formatCostBand(band: CostBand | null): string {
  if (!band) return 'אין עדיין מחיר'
  if (band.low === band.high) return formatIls(band.low)
  return `${formatIls(band.low)}–${formatIls(band.high)}`
}

/** Starting range by fault type, used only when nothing has been paid yet. */
const KIND_ESTIMATE: Record<string, CostBand> = {
  hvac: { low: 450, high: 1800 },
  electrical: { low: 250, high: 900 },
  electrical_hazard: { low: 400, high: 1500 },
  plumbing: { low: 280, high: 850 },
  security: { low: 350, high: 1200 },
  it: { low: 200, high: 900 },
  cleaning: { low: 150, high: 450 },
  other: { low: 200, high: 800 },
}

/**
 * A price to show before a quote is written.
 * Recorded payments of the same fault type win. Otherwise the range is the
 * kind estimate, labeled as such by the caller.
 */
export function estimateFaultCost(
  category: string,
  recorded: CostBand | null,
): { band: CostBand; basis: 'recorded' | 'kind' } {
  if (recorded && recorded.low > 0) return { band: recorded, basis: 'recorded' }
  const key = normalizeTicketCategory(category)
  return { band: KIND_ESTIMATE[key] ?? KIND_ESTIMATE.other!, basis: 'kind' }
}

/** Every new fault gets a repair range, even before a quote is written. */
export function repairRangeLine(category: string, recorded: CostBand | null = null): string {
  const estimate = estimateFaultCost(category, recorded)
  const text = formatCostBand(estimate.band)
  if (estimate.basis === 'recorded') {
    return `טווח משוער לתיקון, לפי מה שכבר שולם על אותו סוג: ${text}.`
  }
  return `טווח משוער לתיקון: ${text}.`
}

export function bandFromPrices(prices: number[]): CostBand | null {
  const clean = prices.filter((price) => price > 0).map((price) => Math.round(price))
  if (clean.length === 0) return null
  return { low: Math.min(...clean), high: Math.max(...clean) }
}

/** Successful call-outs and recorded quotes of the same fault type. Bundle scopes are skipped. */
export function categorySamples(input: {
  outcomes: VendorOutcome[]
  spends: SpendRequest[]
  categoryByTicketId: Record<string, string>
}): Map<string, number[]> {
  const map = new Map<string, number[]>()
  const add = (category: string, amount: number) => {
    if (!(amount > 0)) return
    const key = normalizeTicketCategory(category)
    const list = map.get(key) ?? []
    list.push(Math.round(amount))
    map.set(key, list)
  }

  for (const row of input.outcomes) {
    if (!row.success || row.price == null) continue
    add(row.category, row.price)
  }

  for (const spend of input.spends) {
    if (parseBundleScope(spend.scope)) continue
    if (!spendsContributeToTrueCost(spend) || !spend.ticketId) continue
    const category = input.categoryByTicketId[spend.ticketId]
    if (!category) continue
    add(category, spendAmountForTrueCost(spend))
  }

  return map
}

/** Min and max already written for each fault type. One price stays a point. */
export function recordedCategoryBands(input: {
  outcomes: VendorOutcome[]
  spends: SpendRequest[]
  categoryByTicketId: Record<string, string>
}): { category: string; low: number; high: number }[] {
  const bands: { category: string; low: number; high: number }[] = []
  for (const [category, prices] of categorySamples(input)) {
    const band = bandFromPrices(prices)
    if (!band) continue
    bands.push({ category, low: band.low, high: band.high })
  }
  return bands.sort((a, b) => b.high - a.high || a.category.localeCompare(b.category))
}

export function storeRepairBand(
  categories: string[],
  samples: Map<string, number[]>,
): { band: CostBand | null; missing: number } {
  let low = 0
  let high = 0
  let priced = 0
  let missing = 0
  for (const category of categories) {
    const band = bandFromPrices(samples.get(normalizeTicketCategory(category)) ?? [])
    if (!band) {
      missing += 1
      continue
    }
    low += band.low
    high += band.high
    priced += 1
  }
  return { band: priced > 0 ? { low, high } : null, missing }
}
