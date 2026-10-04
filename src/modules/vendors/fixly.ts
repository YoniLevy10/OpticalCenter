/**
 * Marketplace partner stubs (removed from product surface).
 * Preferred vendors + Midrag professionals contact book are the dispatch path.
 */
export function isPartnerMarketplaceEnabled(): boolean {
  return false
}

/** @deprecated Use Midrag professionals book copy instead. */
export function partnerMarketplaceStatusLabelHe(): string {
  return 'מאגר ספקים מועדפים ואנשי מקצוע ממידרג'
}

/** @deprecated Alias — do not surface in UI. */
export function isFixlyEnabled(): boolean {
  return isPartnerMarketplaceEnabled()
}

/** @deprecated Alias — do not surface in UI. */
export function fixlyStatusLabelHe(): string {
  return partnerMarketplaceStatusLabelHe()
}
