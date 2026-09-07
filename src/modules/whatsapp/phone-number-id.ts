/**
 * Meta WhatsApp Cloud API Phone Number ID helpers.
 * Demo / placeholder IDs must never be sent to Graph.
 */

const DEMO_PHONE_NUMBER_IDS = new Set([
  'wa_phone_il_demo',
  'wa_phone_fr_demo',
  'wa_phone_il',
  'wa_phone_fr',
])

/** True when value looks like a real Meta phone_number_id (numeric). */
export function isMetaPhoneNumberId(
  value: string | null | undefined,
): value is string {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (DEMO_PHONE_NUMBER_IDS.has(trimmed)) return false
  if (/demo/i.test(trimmed)) return false
  // Meta phone number IDs are numeric strings (typically 10–20 digits).
  return /^\d{6,32}$/.test(trimmed)
}

export function envWhatsAppPhoneNumberId(): string | null {
  const candidates = [
    process.env.WHATSAPP_PHONE_NUMBER_ID,
    process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID,
  ]
  for (const c of candidates) {
    if (isMetaPhoneNumberId(c)) return c.trim()
  }
  return null
}

/**
 * Prefer a valid Meta ID. When country DB and env both have numeric IDs but
 * they disagree (typical after Meta app reconnect), env wins — Vercel env is
 * the live wiring; countries.whatsapp_phone_number_id can lag.
 * Never returns demo placeholders.
 */
export function resolveWhatsAppPhoneNumberId(
  countryOrCandidate?: string | null,
): string | null {
  const fromCountry = isMetaPhoneNumberId(countryOrCandidate)
    ? countryOrCandidate.trim()
    : null
  const fromEnv = envWhatsAppPhoneNumberId()
  if (fromEnv && fromCountry && fromEnv !== fromCountry) {
    return fromEnv
  }
  return fromCountry || fromEnv
}

/** Digits-only WhatsApp recipient (Meta `to` field). */
export function normalizeWhatsAppRecipient(waId: string): string {
  return waId.replace(/\D/g, '') || waId.trim()
}
