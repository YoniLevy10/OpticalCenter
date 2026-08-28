#!/usr/bin/env node
/**
 * Update countries.whatsapp_phone_number_id (+ optional display phone) after Meta setup.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/configure-whatsapp-country.mjs --code=IL --phone-number-id=123456 --display=9725...
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

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
if (display) patch.whatsapp_display_phone = display.replace(/\D/g, '')

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
