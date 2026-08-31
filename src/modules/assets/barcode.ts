/**
 * Asset barcode helpers — ported patterns from MediTactic scan/lookup.
 */

const SCAN_HISTORY_KEY = 'maintainos_asset_scan_history'
const MAX_HISTORY = 20

export type AssetLookupRow = {
  id: string
  code: string
  name: string
  barcode?: string | null
  store_code?: string
  store_name?: string
}

export type ScanHistoryEntry = {
  query: string
  at: number
  foundId?: string
  foundName?: string
  success: boolean
}

/** Normalize raw scanner / keyboard wedge input. */
export function normalizeBarcode(raw: string): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase()
}

/** True when the value looks like a typical retail / product barcode. */
export function looksLikeProductBarcode(value: string): boolean {
  const v = normalizeBarcode(value)
  if (!v) return false
  if (/^\d{8}$/.test(v) || /^\d{12,14}$/.test(v)) return true
  if (/^[A-Z0-9][A-Z0-9._-]{2,47}$/.test(v)) return true
  return false
}

/** QR payload printed on asset labels (not WhatsApp deep links). */
export function buildAssetQrPayload(code: string): string {
  const v = normalizeBarcode(code)
  return v ? `optical:asset:${v}` : ''
}

/** Extract asset code from Optical Center label QR / sku query / raw text. */
export function extractAssetCodeFromPayload(raw: string): string {
  const query = normalizeBarcode(raw)
  if (!query) return ''

  const optical = query.match(/^OPTICAL:ASSET:(.+)$/i)
  if (optical?.[1]) return normalizeBarcode(optical[1])

  const meditactic = query.match(/^MEDITACTIC:SKU:(.+)$/i)
  if (meditactic?.[1]) return normalizeBarcode(meditactic[1])

  const fromParam = query.match(/(?:^|[?&])(?:SKU|CODE|ASSET)=([^&]+)/i)?.[1]
  if (fromParam) return normalizeBarcode(decodeURIComponent(fromParam))

  return query
}

/**
 * Find an asset by scanned barcode / QR payload / internal code / name.
 * Exact matches win; unique partial matches are accepted as a fallback.
 */
export function findAssetByCode(
  assets: AssetLookupRow[],
  rawCode: string,
): AssetLookupRow | null {
  if (!Array.isArray(assets) || assets.length === 0) return null

  const query = extractAssetCodeFromPayload(rawCode)
  if (!query) return null

  const exactBarcode = assets.find(
    (a) => a.barcode && normalizeBarcode(a.barcode) === query,
  )
  if (exactBarcode) return exactBarcode

  const exactCode = assets.find((a) => normalizeBarcode(a.code) === query)
  if (exactCode) return exactCode

  const exactName = assets.find(
    (a) => a.name.trim().toUpperCase() === query,
  )
  if (exactName) return exactName

  const partialCode = assets.filter((a) => {
    const code = normalizeBarcode(a.code)
    const barcode = a.barcode ? normalizeBarcode(a.barcode) : ''
    return (
      code.includes(query) ||
      query.includes(code) ||
      (barcode && (barcode.includes(query) || query.includes(barcode)))
    )
  })
  if (partialCode.length === 1) return partialCode[0]

  const partialName = assets.filter((a) =>
    a.name.toUpperCase().includes(query),
  )
  if (partialName.length === 1) return partialName[0]

  return null
}

export function loadScanHistory(): ScanHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(SCAN_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as ScanHistoryEntry[]) : []
  } catch {
    return []
  }
}

export function appendScanHistory(
  entry: ScanHistoryEntry,
  previous: ScanHistoryEntry[] = loadScanHistory(),
): ScanHistoryEntry[] {
  const next = [
    entry,
    ...previous.filter((h) => h.query !== entry.query),
  ].slice(0, MAX_HISTORY)
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(next))
    } catch {
      /* private mode */
    }
  }
  return next
}
