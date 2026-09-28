import { TICKET_CATEGORY_LABELS_HE } from '@/modules/tickets/constants'

/**
 * Midrag (מידרג) external professional search.
 * Opens in a new tab — not an iframe (X-Frame / product stance).
 *
 * Midrag Results deep links need **serviceId + cityId** (not areaId alone).
 * areaId is a region bucket (e.g. 1 = תל אביב) and is what made unmapped
 * / nationwide searches feel “stuck” on Tel Aviv. cityId comes from
 * Midrag `/Search/ListCities` (`{ label, value, areaName }`).
 */

export type ExternalSearchInput = {
  category: string
  city?: string | null
}

export type MidragCityMatch = {
  /** Midrag cityId (ListCities `value`) */
  cityId: number
  /** Canonical Midrag label (may differ from OC store city spelling) */
  midragLabel: string
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
 * OC store city → Midrag cityId (from live ListCities).
 * Aliases (OC spelling → Midrag label) are folded into keys so tickets
 * matching israel-stores.ts resolve without a second lookup.
 */
export const MIDRAG_CITY_ID_BY_CITY: Record<string, MidragCityMatch> = {
  'תל אביב': { cityId: 1243, midragLabel: 'תל אביב' },
  תלאביב: { cityId: 1243, midragLabel: 'תל אביב' },
  'תל-אביב': { cityId: 1243, midragLabel: 'תל אביב' },
  'תל אביב יפו': { cityId: 1243, midragLabel: 'תל אביב' },
  חיפה: { cityId: 421, midragLabel: 'חיפה' },
  ירושלים: { cityId: 515, midragLabel: 'ירושלים' },
  נתניה: { cityId: 900, midragLabel: 'נתניה' },
  'כפר סבא': { cityId: 605, midragLabel: 'כפר סבא' },
  'פתח תקווה': { cityId: 1032, midragLabel: 'פתח תקווה' },
  רעננה: { cityId: 1149, midragLabel: 'רעננה' },
  מודיעין: { cityId: 683, midragLabel: 'מודיעין' },
  רמלה: { cityId: 1132, midragLabel: 'רמלה' },
  'נס ציונה': { cityId: 883, midragLabel: 'נס ציונה' },
  'קרית עקרון': { cityId: 1094, midragLabel: 'קרית עקרון' },
  'קריית עקרון': { cityId: 1094, midragLabel: 'קרית עקרון' },
  'ראשון לציון': { cityId: 1105, midragLabel: 'ראשון לציון' },
  רחובות: { cityId: 1120, midragLabel: 'רחובות' },
  'בת ים': { cityId: 237, midragLabel: 'בת ים' },
  חולון: { cityId: 406, midragLabel: 'חולון' },
  // OC: פרדס חנה → Midrag: פרדס חנה-כרכור
  'פרדס חנה': { cityId: 1027, midragLabel: 'פרדס חנה-כרכור' },
  'פרדס חנה-כרכור': { cityId: 1027, midragLabel: 'פרדס חנה-כרכור' },
  'קרית אתא': { cityId: 1083, midragLabel: 'קרית אתא' },
  'קריית אתא': { cityId: 1083, midragLabel: 'קרית אתא' },
  'בית שמש': { cityId: 194, midragLabel: 'בית שמש' },
  כרמיאל: { cityId: 632, midragLabel: 'כרמיאל' },
  עכו: { cityId: 979, midragLabel: 'עכו' },
  רגבה: { cityId: 1110, midragLabel: 'רגבה' },
  טבריה: { cityId: 450, midragLabel: 'טבריה' },
  'קרית שמונה': { cityId: 1096, midragLabel: 'קרית שמונה' },
  'קריית שמונה': { cityId: 1096, midragLabel: 'קרית שמונה' },
  // OC: יקנעם → Midrag: יקנעם עילית
  יקנעם: { cityId: 510, midragLabel: 'יקנעם עילית' },
  'יקנעם עילית': { cityId: 510, midragLabel: 'יקנעם עילית' },
  'מגדל העמק': { cityId: 671, midragLabel: 'מגדל העמק' },
  'נוף הגליל': { cityId: 894, midragLabel: 'נוף הגליל' },
  עפולה: { cityId: 995, midragLabel: 'עפולה' },
  אשדוד: { cityId: 121, midragLabel: 'אשדוד' },
  אשקלון: { cityId: 128, midragLabel: 'אשקלון' },
  'באר שבע': { cityId: 136, midragLabel: 'באר שבע' },
  דימונה: { cityId: 347, midragLabel: 'דימונה' },
  'בני ברק': { cityId: 205, midragLabel: 'בני ברק' },
  הרצליה: { cityId: 378, midragLabel: 'הרצליה' },
  'רמת גן': { cityId: 1134, midragLabel: 'רמת גן' },
  'רמת השרון': { cityId: 1138, midragLabel: 'רמת השרון' },
  אריאל: { cityId: 117, midragLabel: 'אריאל' },
  נתיבות: { cityId: 899, midragLabel: 'נתיבות' },
  חדרה: { cityId: 403, midragLabel: 'חדרה' },
}

const MIDRAG_RESULTS = 'https://www.midrag.co.il/Search/Results'
const MIDRAG_IN_SECTOR = 'https://www.midrag.co.il/Search/InSector'
const MIDRAG_IN_CITY = 'https://www.midrag.co.il/Search/InCity'

function normalizeCity(city: string | null | undefined): string {
  return (city ?? '').trim().replace(/\s+/g, ' ')
}

function compactCity(city: string): string {
  return city.replace(/[-\s]/g, '')
}

/** Resolve OC / free-text city to Midrag cityId + canonical label. */
export function midragCityMatchForCity(
  city: string | null | undefined,
): MidragCityMatch | null {
  const c = normalizeCity(city)
  if (!c) return null
  const direct = MIDRAG_CITY_ID_BY_CITY[c]
  if (direct) return direct
  const compact = compactCity(c)
  for (const [name, match] of Object.entries(MIDRAG_CITY_ID_BY_CITY)) {
    if (compactCity(name) === compact) return match
  }
  return null
}

/** @deprecated Prefer midragCityMatchForCity — areaId alone is imprecise. */
export function midragAreaIdForCity(city: string | null | undefined): number {
  // Kept for any legacy callers; city-precise search uses cityId.
  const match = midragCityMatchForCity(city)
  if (!match) return 0
  // Known Midrag area buckets for major cities (informational only).
  const AREA_BY_CITY_ID: Record<number, number> = {
    1243: 1, // תל אביב
    515: 2, // ירושלים
    421: 3, // חיפה
  }
  return AREA_BY_CITY_ID[match.cityId] ?? 0
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
 * Prefer Results with serviceId + cityId; never invent Tel Aviv.
 */
export function buildMidragSearchUrl(input: ExternalSearchInput): string {
  const serviceId = midragServiceIdForCategory(input.category)
  const cityMatch = midragCityMatchForCity(input.city)

  if (serviceId != null) {
    if (cityMatch) {
      return `${MIDRAG_RESULTS}?serviceId=${serviceId}&cityId=${cityMatch.cityId}`
    }
    // No city → Results without location (user picks on Midrag / InCity helper)
    return `${MIDRAG_RESULTS}?serviceId=${serviceId}`
  }

  // Unknown trade — let HQ pick sector on Midrag
  return MIDRAG_IN_SECTOR
}

/** When city is known but unmapped, offer Midrag city picker for the service. */
export function buildMidragCityPickerUrl(input: ExternalSearchInput): string | null {
  const serviceId = midragServiceIdForCategory(input.category)
  if (serviceId == null) return null
  if (midragCityMatchForCity(input.city)) return null
  if (!normalizeCity(input.city)) return null
  return `${MIDRAG_IN_CITY}?serviceId=${serviceId}`
}

/** Google query biased to Midrag — backup when Midrag Results are too broad. */
export function buildMidragGoogleBackupUrl(input: ExternalSearchInput): string {
  const trade = tradeLabelHe(input.category)
  const match = midragCityMatchForCity(input.city)
  const city = match?.midragLabel || normalizeCity(input.city)
  const q = ['מידרג', trade, city].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

export function externalSearchCaption(input: ExternalSearchInput): string {
  const trade = tradeLabelHe(input.category)
  const match = midragCityMatchForCity(input.city)
  const city = normalizeCity(input.city)
  if (match) {
    const label =
      city && city !== match.midragLabel
        ? `${city} → ${match.midragLabel}`
        : match.midragLabel
    return `מידרג · ${trade} · ${label}`
  }
  if (city) return `מידרג · ${trade} · ${city} (בחירת עיר במידרג)`
  return `מידרג · ${trade} · ללא עיר`
}
