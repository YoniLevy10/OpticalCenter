export type VendorOutcome = {
  vendorId: string
  vendorName: string
  category: string
  region: string | null
  price: number | null
  arrivalMinutes: number | null
  quality: number | null
  warrantyNote: string | null
  success: boolean
}

export function rankKnownVendors(
  outcomes: VendorOutcome[],
  category: string,
  region?: string | null,
): VendorOutcome[] {
  return outcomes
    .filter((row) => row.category === category && row.success)
    .filter((row) => !region || !row.region || row.region === region)
    .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))
}
