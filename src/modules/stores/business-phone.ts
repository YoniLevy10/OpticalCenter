import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { getSettings } from '@/modules/settings/service'
import { MEM_ORG_ID, supabaseReady } from '@/lib/data/memory-store'

/** Digits-only E.164-ish business number, or null if unset. */
export function normalizeBusinessPhone(
  value: string | null | undefined,
): string | null {
  const digits = (value || '').replace(/\D/g, '')
  return digits || null
}

function envBusinessPhone(): string | null {
  return normalizeBusinessPhone(process.env.NEXT_PUBLIC_WA_BUSINESS_PHONE)
}

/**
 * Resolve the WhatsApp Business display number used in QR / NFC / wa.me links.
 *
 * Order:
 * 1. Ops → Settings → `app_settings.wa_business_phone`
 * 2. `countries.whatsapp_display_phone` (first non-empty for org, IL preferred)
 * 3. `NEXT_PUBLIC_WA_BUSINESS_PHONE`
 */
export async function resolveWhatsAppBusinessPhone(): Promise<string | null> {
  try {
    const { settings } = await getSettings()
    const fromSettings = normalizeBusinessPhone(settings.wa_business_phone)
    if (fromSettings) return fromSettings
  } catch {
    /* fall through */
  }

  if (await supabaseReady()) {
    try {
      const supabase = createSystemClient('wa_business_phone')
      const { data, error } = await supabase
        .from('countries')
        .select('code, whatsapp_display_phone')
        .eq('organization_id', MEM_ORG_ID)

      if (!error && data?.length) {
        const il = data.find(
          (c) =>
            c.code === 'IL' &&
            normalizeBusinessPhone(c.whatsapp_display_phone as string | null),
        )
        if (il) {
          return normalizeBusinessPhone(
            il.whatsapp_display_phone as string | null,
          )
        }
        for (const row of data) {
          const phone = normalizeBusinessPhone(
            row.whatsapp_display_phone as string | null,
          )
          if (phone) return phone
        }
      } else if (error && !isSupabaseSchemaError(error)) {
        /* ignore — fall through to env */
      }
    } catch {
      /* fall through */
    }
  }

  return envBusinessPhone()
}
