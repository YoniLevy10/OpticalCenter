import { TICKET_CATEGORY_LABELS_HE } from '@/modules/tickets/constants'

/**
 * Midrag (מידרג) external professional search.
 * Opens in a new tab — not an iframe (X-Frame / product stance).
 *
 * Official Results URLs use serviceId + areaId.
 * areaId=0 = nationwide; known city → area when mapped.
 */

export type ExternalSearchInput = {
  category: string
  city?: string | null
}

/** Midrag service IDs for Optical Center ticket categories (best-effort). */
export const MIDRAG_SERVICE_ID: Record<string, number> = {
  hvac: 286, // תיקון מזגן מרכזי
  electrical: 152, // תיקון קצר / חשמלאי
  plumbing: 135, // ניאגרות ואסלות (אינסטלציה)
  it: 182, // תיקון מחשבים
  security: 509, // מצלמות אבטחה
  // cleaning / other → InSector fallback
}

/**
 * Midrag areaId values we have verified from live Midrag URLs.
 * Unmapped cities → areaId=0 (nationwide) + optional InCity picker.
 */
export const MIDRAG_AREA_ID_BY_CITY: Record<string, number> = {
  'תל אביב': 1,
  תלאביב: 1,
  'תל-אביב': 1,
  הרצליה: 12,
  'רמת השרון': 12,
}

const MIDRAG_RESULTS = 'https://www.midrag.co.il/Search/Results'
const MIDRAG_IN_SECTOR = 'https://www.midrag.co.il/Search/InSector'
const MIDRAG_IN_CITY = 'https://www.midrag.co.il/Search/InCity'

function normalizeCity(city: string | null | undefined): string {
  return (city ?? '').trim().replace(/\s+/g, ' ')
}

export function midragAreaIdForCity(city: string | null | undefined): number {
  const c = normalizeCity(city)
  if (!c) return 0
  if (MIDRAG_AREA_ID_BY_CITY[c] != null) return MIDRAG_AREA_ID_BY_CITY[c]
  const compact = c.replace(/[-\s]/g, '')
  for (const [name, id] of Object.entries(MIDRAG_AREA_ID_BY_CITY)) {
    if (name.replace(/[-\s]/g, '') === compact) return id
  }
  return 0
}

export function midragServiceIdForCategory(category: string): number | null {
  const key = category.trim().toLowerCase()
  return MIDRAG_SERVICE_ID[key] ?? null
}

export function tradeLabelHe(category: string): string {
  return TICKET_CATEGORY_LABELS_HE[category] ?? category
}

/**
 * Primary Midrag deep link for a ticket.
 * Prefer Results with serviceId; fall back to InCity / InSector.
 */
export function buildMidragSearchUrl(input: ExternalSearchInput): string {
  const serviceId = midragServiceIdForCategory(input.category)
  const areaId = midragAreaIdForCity(input.city)

  if (serviceId != null) {
    if (areaId > 0) {
      return `${MIDRAG_RESULTS}?areaId=${areaId}&serviceId=${serviceId}`
    }
    // Nationwide results + optional city picker path
    return `${MIDRAG_RESULTS}?areaId=0&serviceId=${serviceId}`
  }

  // Unknown trade — let HQ pick sector on Midrag
  return MIDRAG_IN_SECTOR
}

/** When city is known but area is unmapped, offer Midrag city picker for the service. */
export function buildMidragCityPickerUrl(input: ExternalSearchInput): string | null {
  const serviceId = midragServiceIdForCategory(input.category)
  if (serviceId == null) return null
  const areaId = midragAreaIdForCity(input.city)
  if (areaId > 0) return null
  if (!normalizeCity(input.city)) return null
  return `${MIDRAG_IN_CITY}?serviceId=${serviceId}`
}

/** Google query biased to Midrag — backup when Midrag Results are too broad. */
export function buildMidragGoogleBackupUrl(input: ExternalSearchInput): string {
  const trade = tradeLabelHe(input.category)
  const city = normalizeCity(input.city)
  const q = ['מידרג', trade, city].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

export function externalSearchCaption(input: ExternalSearchInput): string {
  const trade = tradeLabelHe(input.category)
  const city = normalizeCity(input.city)
  if (city) return `מידרג · ${trade} · ${city}`
  return `מידרג · ${trade} · ארצי`
}
