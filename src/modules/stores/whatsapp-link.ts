import { storeWhatsAppPrefill } from '@/modules/tickets/constants'

/**
 * Same URL for QR print and NFC tag write.
 * Country WhatsApp number comes from env until countries.whatsapp_display_phone is set.
 */
export function storeWhatsAppDeepLink(storeCode: string, businessPhoneE164?: string | null) {
  const phone = (businessPhoneE164 || process.env.NEXT_PUBLIC_WA_BUSINESS_PHONE || '').replace(/\D/g, '')
  const text = encodeURIComponent(storeWhatsAppPrefill(storeCode))
  if (!phone) {
    // Placeholder until Meta number is configured — still encodes store intent
    return `https://wa.me/?text=${text}`
  }
  return `https://wa.me/${phone}?text=${text}`
}
