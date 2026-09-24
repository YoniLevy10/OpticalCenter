import type { IlRegionCode } from '@/modules/stores/regions'
import { regionCodeFromId } from '@/modules/stores/regions'

export type MatchableVendor = {
  id: string
  name: string
  specialties: string
  active: boolean
  preferred?: boolean
  coverage_regions?: string[] | null
  contact_phone?: string | null
  notes?: string | null
}

export type VendorMatch = MatchableVendor & {
  score: number
  reason: string
}

/**
 * Rank preferred vendors for a ticket by specialty ∩ coverage region.
 * Preferred + coverage hit beats specialty-only. Inactive excluded.
 */
export function matchPreferredVendors(
  vendors: MatchableVendor[],
  input: {
    category: string
    regionIdOrCode?: string | null
  },
): VendorMatch[] {
  const category = (input.category || 'other').trim().toLowerCase()
  const region = regionCodeFromId(input.regionIdOrCode ?? null)

  const scored: VendorMatch[] = []
  for (const v of vendors) {
    if (!v.active) continue
    const specs = v.specialties
      .split(/[,|]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const specialtyHit =
      specs.includes(category) ||
      specs.includes('general') ||
      specs.includes('other')
    if (!specialtyHit) continue

    const coverage = (v.coverage_regions ?? []).map((c) => c.toUpperCase())
    const coverageHit = region
      ? coverage.length === 0 || coverage.includes(region)
      : coverage.length === 0
    if (region && coverage.length > 0 && !coverageHit) continue

    let score = 10
    let reason = 'התאמת מקצוע'
    if (v.preferred) {
      score += 40
      reason = 'ספק מועדף'
    }
    if (region && coverageHit && coverage.length > 0) {
      score += 30
      reason = v.preferred
        ? `מועדף · כיסוי ${region}`
        : `כיסוי ${region}`
    }
    if (specs.includes(category)) score += 10

    scored.push({ ...v, score, reason })
  }

  return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'he'))
}

export function coverageSummary(
  vendors: MatchableVendor[],
  regions: IlRegionCode[],
  trades: string[],
): { region: IlRegionCode; trade: string; covered: boolean }[] {
  const rows: { region: IlRegionCode; trade: string; covered: boolean }[] = []
  for (const region of regions) {
    for (const trade of trades) {
      const hit = matchPreferredVendors(vendors, {
        category: trade,
        regionIdOrCode: region,
      }).some((v) => v.preferred)
      rows.push({ region, trade, covered: hit })
    }
  }
  return rows
}
