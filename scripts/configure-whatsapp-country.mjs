#!/usr/bin/env node
/**
 * Update countries.whatsapp_phone_number_id (+ optional display phone) after Meta setup.
 * Also syncs app_settings.wa_business_phone when --display is provided (needed for QR).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/configure-whatsapp-country.mjs --code=IL --phone-number-id=123456 --display=9725...
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const ORG_ID = '11111111-1111-1111-1111-111111111111'

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

const code = (arg('code') || 'IL').toUpperCase()
const phoneNumberId = arg('phone-number-id')
const display = arg('display')

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!phoneNumberId) {
  console.error('Need --phone-number-id=<Meta phone number id>')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const patch = {
  whatsapp_phone_number_id: phoneNumberId,
}
const displayDigits = display ? display.replace(/\D/g, '') : null
if (displayDigits) patch.whatsapp_display_phone = displayDigits

const { data, error } = await supabase
  .from('countries')
  .update(patch)
  .eq('code', code)
  .select('id, code, whatsapp_phone_number_id, whatsapp_display_phone')
  .maybeSingle()

if (error) {
  console.error(error.message)
  process.exit(1)
}
if (!data) {
  console.error(`Country ${code} not found`)
  process.exit(1)
}
console.log('Updated country WhatsApp routing:', data)

if (displayDigits) {
  const { data: settings, error: settingsErr } = await supabase
    .from('app_settings')
    .upsert(
      {
        organization_id: ORG_ID,
        wa_business_phone: displayDigits,
      },
      { onConflict: 'organization_id' },
    )
    .select('organization_id, wa_business_phone')
    .maybeSingle()

  if (settingsErr) {
    console.warn(
      'Country updated, but app_settings.wa_business_phone sync failed:',
      settingsErr.message,
    )
    console.warn(
      'Set the number manually in Ops → Settings → WhatsApp so QR generation works.',
    )
  } else {
    console.log('Synced app_settings.wa_business_phone for QR:', settings)
  }
}
