import { storeWhatsAppPrefill } from '@/modules/tickets/constants'

function businessPhoneDigits(): string {
  return (process.env.NEXT_PUBLIC_WA_BUSINESS_PHONE || '').replace(/\D/g, '')
}

/** Generic wa.me link with arbitrary prefill text. */
export function whatsAppShareUrl(text: string, businessPhoneE164?: string | null): string {
  const phone = (businessPhoneE164 || businessPhoneDigits()).replace(/\D/g, '')
  const encoded = encodeURIComponent(text)
  if (!phone) return `https://wa.me/?text=${encoded}`
  return `https://wa.me/${phone}?text=${encoded}`
}

/**
 * Same URL for QR print and NFC tag write.
 * Prefer passing an explicit phone from `resolveWhatsAppBusinessPhone()`
 * (settings → countries.whatsapp_display_phone → env).
 */
export function storeWhatsAppDeepLink(storeCode: string, businessPhoneE164?: string | null) {
  return whatsAppShareUrl(storeWhatsAppPrefill(storeCode), businessPhoneE164)
}
