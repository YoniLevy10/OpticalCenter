#!/usr/bin/env node
/**
 * Link employee WhatsApp wa_id → store for hybrid identity.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/seed-store-phones.mjs --store=172 --wa=972501112233 --label="מנהל חנות"
 *
 * Multiple:
 *   --map=172:97250...,101:97250...
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const countryCode = (
  process.argv.find((a) => a.startsWith('--country='))?.split('=')[1] || 'IL'
).toUpperCase()

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const pairs = []
const map = arg('map')
if (map) {
  for (const part of map.split(',')) {
    const [store, wa] = part.split(':')
    if (store && wa) pairs.push({ store: store.trim(), wa: wa.replace(/\D/g, '') })
  }
} else {
  const store = arg('store')
  const wa = arg('wa')?.replace(/\D/g, '')
  if (store && wa) pairs.push({ store, wa, label: arg('label') || 'pilot' })
}

if (!pairs.length) {
  console.error(`Usage:
  node scripts/seed-store-phones.mjs --store=172 --wa=97250... --label="..."
  node scripts/seed-store-phones.mjs --map=172:97250...,101:97250...
`)
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: country, error: cErr } = await supabase
  .from('countries')
  .select('id')
  .eq('code', countryCode)
  .maybeSingle()
if (cErr || !country) {
  console.error(cErr?.message || `Country ${countryCode} not found`)
  process.exit(1)
}

for (const p of pairs) {
  const { data: store, error: sErr } = await supabase
    .from('stores')
    .select('id, code, name')
    .eq('country_id', country.id)
    .eq('code', p.store)
    .maybeSingle()
  if (sErr || !store) {
    console.error(`Store ${p.store}:`, sErr?.message || 'not found')
    continue
  }

  const { data: existing } = await supabase
    .from('store_phones')
    .select('id, store_id')
    .eq('wa_id', p.wa)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('store_phones')
      .update({
        store_id: store.id,
        label: p.label || 'pilot',
        is_primary: true,
      })
      .eq('id', existing.id)
    if (error) console.error(p.wa, error.message)
    else console.log(`Updated ${p.wa} → ${store.code} ${store.name}`)
  } else {
    const { error } = await supabase.from('store_phones').insert({
      store_id: store.id,
      wa_id: p.wa,
      is_primary: true,
      label: p.label || 'pilot',
    })
    if (error) console.error(p.wa, error.message)
    else console.log(`Linked ${p.wa} → ${store.code} ${store.name}`)
  }
}
