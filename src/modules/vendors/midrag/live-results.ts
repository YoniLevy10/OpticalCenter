import {
  buildMidragSearchUrl,
  midragCityMatchForCity,
  midragServiceMatchForCategory,
} from '@/modules/vendors/external-search'

export type MidragPro = {
  id: number
  name: string
  rating: number | null
  reviews: number | null
  availability: string | null
  /** Indicative Midrag range. Not the price Ari locks. */
  priceMin: number | null
  priceMax: number | null
  profileUrl: string
}

export type MidragLiveResult = {
  pros: MidragPro[]
  searchUrl: string
  /** True when the page could not be read. The UI falls back to the link. */
  fallback: boolean
}

const TTL_MS = 15 * 60 * 1000
const MIN_GAP_MS = 1500
const cache = new Map<string, { at: number; pros: MidragPro[] }>()
let lastFetchAt = 0

function decodeAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

type SpCard = {
  Id?: number
  Name?: string
  AverageRankForGeneral?: number
  FeedbacksCount?: number
  AvailabilityRangeName?: string | null
  AreaId?: number | null
  ServiceId?: number | null
  PersonalPriceLists?: { MinPrice?: number; MaxPrice?: number } | null
}

/** Pull professional cards from a Midrag results HTML page (`data-sp`). */
export function parseMidragResultsHtml(html: string): MidragPro[] {
  const pros: MidragPro[] = []
  const seen = new Set<number>()
  const pattern = /data-sp=(["'])([\s\S]*?)\1/g
  for (const match of html.matchAll(pattern)) {
    const raw = match[2]
    if (!raw) continue
    let card: SpCard
    try {
      card = JSON.parse(decodeAttr(raw)) as SpCard
    } catch {
      continue
    }
    const id = num(card.Id)
    const name = card.Name?.trim()
    if (id == null || !name || seen.has(id)) continue
    seen.add(id)
    const areaId = num(card.AreaId)
    const serviceId = num(card.ServiceId)
    const query = new URLSearchParams()
    if (areaId != null) query.set('areaId', String(areaId))
    if (serviceId != null) query.set('serviceId', String(serviceId))
    const qs = query.toString()
    pros.push({
      id,
      name,
      rating: num(card.AverageRankForGeneral),
      reviews: num(card.FeedbacksCount),
      availability: card.AvailabilityRangeName?.trim() || null,
      priceMin: num(card.PersonalPriceLists?.MinPrice),
      priceMax: num(card.PersonalPriceLists?.MaxPrice),
      profileUrl: `https://www.midrag.co.il/SpCard/Sp/${id}${qs ? `?${qs}` : ''}`,
    })
  }
  return pros
}

export async function loadMidragResults(input: {
  category: string
  city?: string | null
}): Promise<MidragLiveResult> {
  const searchUrl = buildMidragSearchUrl(input)
  const service = midragServiceMatchForCategory(input.category)
  const city = midragCityMatchForCity(input.city)
  if (!service || !city || !searchUrl.includes('/Search/Results')) {
    return { pros: [], searchUrl, fallback: true }
  }
  const key = `${service.serviceId}:${city.cityId}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { pros: hit.pros, searchUrl, fallback: hit.pros.length === 0 }
  }
  if (Date.now() - lastFetchAt < MIN_GAP_MS) {
    return { pros: hit?.pros ?? [], searchUrl, fallback: !hit?.pros.length }
  }
  lastFetchAt = Date.now()
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MaintainOS/1.0; +https://optical-center.co.il)',
        'Accept-Language': 'he',
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (!response.ok) return { pros: [], searchUrl, fallback: true }
    const html = await response.text()
    const pros = parseMidragResultsHtml(html)
    cache.set(key, { at: Date.now(), pros })
    return { pros, searchUrl, fallback: pros.length === 0 }
  } catch {
    return { pros: hit?.pros ?? [], searchUrl, fallback: true }
  }
}
