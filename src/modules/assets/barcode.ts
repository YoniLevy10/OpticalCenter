/**
 * Normalize a scanned product barcode / serial for asset code matching.
 * Strips noise from scanners that append check-digit separators or CRLF.
 */
export function normalizeBarcode(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase()
}

/** True when the value looks like a typical retail / product barcode. */
export function looksLikeProductBarcode(value: string): boolean {
  const v = normalizeBarcode(value)
  if (!v) return false
  // EAN-8 / UPC-E / EAN-13 / UPC-A / common Code-128 alphanumeric serials
  if (/^\d{8}$/.test(v) || /^\d{12,14}$/.test(v)) return true
  if (/^[A-Z0-9][A-Z0-9._-]{2,47}$/.test(v)) return true
  return false
}
