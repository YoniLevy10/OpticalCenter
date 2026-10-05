/** Digits-only E.164-ish phone (no +). Empty → null. */
export function normalizePhoneDigits(
  input: string | null | undefined,
): string | null {
  if (input == null) return null
  const raw = String(input).trim()
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null
  // Israel local → international (05… → 9725…)
  if (digits.startsWith('0') && digits.length >= 9) {
    digits = `972${digits.slice(1)}`
  }
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

/** Israeli mobile for people to read: 9725… or 05… → 05X-XXXXXXX. */
export function formatIsraeliPhoneDisplay(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('972')) digits = `0${digits.slice(3)}`
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }
  return phone.trim()
}

/** Display-friendly: keep user input trimmed, or null if blank. */
export function sanitizePhoneInput(
  input: string | null | undefined,
): string | null {
  if (input == null) return null
  const trimmed = String(input).trim()
  return trimmed ? trimmed : null
}
