import { TICKET_CATEGORY_LABELS_HE } from '@/modules/tickets/constants'
import {
  IL_REGION_CODES,
  IL_REGION_LABELS_HE,
  regionCodeFromId,
  regionLabelHe,
  type IlRegionCode,
} from '@/modules/stores/regions'
import { isDeliverableTechPhone } from '@/modules/visits/visit-sms'
import { matchPreferredVendors, type MatchableVendor } from './match'

export type VisitPoolVendor = {
  id: string
  name: string
  specialties?: string
  coverage?: string[] | null
  phone?: string | null
}

export type VisitVendorGroup = {
  city: string
  vendors: VisitPoolVendor[]
}

const TRADE_ALIAS: Record<string, string> = {
  electrical_hazard: 'electrical',
}

function tradeKey(category: string | null | undefined): string {
  const raw = (category || 'other').trim().toLowerCase()
  return TRADE_ALIAS[raw] ?? raw
}

/** Store city name, or a district code, into one of the six coverage areas. */
export function regionForVisit(input: {
  city?: string | null
  region?: string | null
}): IlRegionCode | null {
  const fromCode = regionCodeFromId(input.region ?? null)
  if (fromCode) return fromCode
  const city = (input.city ?? '').replace(/[-־]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!city) return null
  for (const code of IL_REGION_CODES) {
    const label = IL_REGION_LABELS_HE[code]
    if (city.includes(label) || label.includes(city)) return code
  }
  return null
}

export function tradeLabel(category: string | null | undefined): string {
  const key = (category || '').trim().toLowerCase()
  return TICKET_CATEGORY_LABELS_HE[key] ?? TICKET_CATEGORY_LABELS_HE[tradeKey(key)] ?? 'המקצוע'
}

function asMatchable(vendor: VisitPoolVendor): MatchableVendor | null {
  const specialties = vendor.specialties?.trim()
  if (!specialties) return null
  return {
    id: vendor.id,
    name: vendor.name,
    specialties,
    active: true,
    preferred: true,
    coverage_regions: vendor.coverage ?? [],
  }
}

/** The one person from our pool who covers this trade in this area. */
export function suggestVisitVendor(
  vendors: VisitPoolVendor[],
  input: { category?: string | null; city?: string | null; region?: string | null },
): VisitPoolVendor | null {
  const region = regionForVisit(input)
  const ranked = matchPreferredVendors(
    vendors.flatMap((vendor) => {
      const row = asMatchable(vendor)
      return row ? [row] : []
    }),
    {
    category: tradeKey(input.category),
    regionIdOrCode: region,
  })
  const live = ranked.find((row) =>
    isDeliverableTechPhone(vendors.find((vendor) => vendor.id === row.id)?.phone),
  )
  const top = live ?? ranked[0]
  if (!top) return null
  return vendors.find((vendor) => vendor.id === top.id) ?? null
}

function coverageCodes(vendor: VisitPoolVendor): IlRegionCode[] {
  return (vendor.coverage ?? [])
    .map((code) => regionCodeFromId(code))
    .filter((code): code is IlRegionCode => Boolean(code))
}

/** Pool arranged by city. A person who covers two cities appears in both. The store's city comes first. */
export function groupVisitVendors(
  vendors: VisitPoolVendor[],
  input: { city?: string | null; region?: string | null },
): VisitVendorGroup[] {
  const here = regionForVisit(input)
  const buckets = new Map<string, VisitPoolVendor[]>()
  const national: VisitPoolVendor[] = []
  for (const vendor of vendors) {
    const coverage = coverageCodes(vendor)
    if (coverage.length === 0 || coverage.length >= IL_REGION_CODES.length) {
      national.push(vendor)
      if (here && isDeliverableTechPhone(vendor.phone)) {
        const label = IL_REGION_LABELS_HE[here]
        const list = buckets.get(label) ?? []
        list.push(vendor)
        buckets.set(label, list)
      }
      continue
    }
    for (const code of coverage) {
      const label = IL_REGION_LABELS_HE[code]
      const list = buckets.get(label) ?? []
      list.push(vendor)
      buckets.set(label, list)
    }
  }
  const groups = [...buckets.entries()].map(([city, rows]) => ({
    city,
    vendors: [...rows].sort((a, b) => a.name.localeCompare(b.name, 'he')),
  }))
  if (national.length > 0) {
    groups.push({
      city: 'ארצי',
      vendors: [...national].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    })
  }
  const hereLabel = here ? IL_REGION_LABELS_HE[here] : null
  return groups.sort((a, b) => {
    const rank = (city: string) => (city === hereLabel ? 0 : city === 'ארצי' ? 2 : 1)
    const diff = rank(a.city) - rank(b.city)
    if (diff !== 0) return diff
    return a.city.localeCompare(b.city, 'he')
  })
}

export function visitPlaceLabel(input: {
  city?: string | null
  region?: string | null
}): string | null {
  const city = input.city?.trim()
  if (city) return city
  const region = regionForVisit(input)
  if (!region) return null
  const label = regionLabelHe(region)
  return label === '—' ? null : label
}
