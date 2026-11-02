/** Digits-only phone. Israel 05… becomes 9725…. */
export function normalizePhoneDigits(input) {
  if (input == null) return null
  const raw = String(input).trim()
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0') && digits.length >= 9) {
    digits = `972${digits.slice(1)}`
  }
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

/**
 * Which manager phones may be written to store_phones.
 * Skips a blank number, a desk phone, a number shared by two stores,
 * and a number already mapped to a different store.
 */
export function planManagerPhones(input) {
  const blocked = new Set(
    input.blockedPhones.map((phone) => normalizePhoneDigits(phone)).filter(Boolean),
  )
  const existingByWa = new Map()
  for (const row of input.existing) {
    const wa = normalizePhoneDigits(row.waId)
    if (wa && !existingByWa.has(wa)) existingByWa.set(wa, row.storeCode)
  }

  const normalized = input.stores.map((store) => ({
    store,
    waId: normalizePhoneDigits(store.phone),
  }))
  const counts = new Map()
  for (const row of normalized) {
    if (!row.waId) continue
    counts.set(row.waId, (counts.get(row.waId) ?? 0) + 1)
  }

  return normalized.map(({ store, waId }) => {
    const base = {
      storeCode: store.storeCode,
      managerName: store.managerName,
      waId,
    }
    if (!waId) return { ...base, action: 'skip', reason: 'empty' }
    if (blocked.has(waId)) return { ...base, action: 'skip', reason: 'desk' }
    if ((counts.get(waId) ?? 0) > 1) return { ...base, action: 'skip', reason: 'duplicate' }
    const mapped = existingByWa.get(waId)
    if (mapped && mapped !== store.storeCode) {
      return { ...base, action: 'skip', reason: 'mapped_elsewhere' }
    }
    if (mapped === store.storeCode) return { ...base, action: 'skip', reason: 'already_linked' }
    return { ...base, action: 'link', reason: 'ready' }
  })
}
