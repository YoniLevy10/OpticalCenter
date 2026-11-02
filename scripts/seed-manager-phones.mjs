#!/usr/bin/env node
/**
 * Plan store_phones rows from the Israel manager catalog.
 *
 * Dry-run (default):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/seed-manager-phones.mjs
 *
 * Write the ready rows:
 *   node scripts/seed-manager-phones.mjs --apply
 *
 * Skips a blank number, Ari / the test desk phone, a number shared by two
 * stores, and a number already mapped to a different store.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { planManagerPhones } from './manager-phone-plan.mjs'

/** Keep in sync with ARI_PHONE / TEST_DESK_PHONE in src/lib/data/ops-ledger.ts */
const ARI_PHONE = '0509881951'
const TEST_DESK_PHONE = '0548102688'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const apply = process.argv.includes('--apply')
const countryCode = (
  process.argv.find((arg) => arg.startsWith('--country='))?.split('=')[1] || 'IL'
).toUpperCase()

function catalogFromSource() {
  const text = readFileSync(
    new URL('../src/modules/stores/israel-stores.ts', import.meta.url),
    'utf8',
  )
  const stores = []
  const re =
    /code: '([^']+)'[\s\S]*?managerName: '([^']*)'[\s\S]*?managerPhone: '([^']*)'/g
  for (const match of text.matchAll(re)) {
    stores.push({
      storeCode: match[1],
      managerName: match[2],
      phone: match[3],
    })
  }
  return stores
}

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const catalog = catalogFromSource()
if (catalog.length < 40) {
  console.error(`Catalog parse found ${catalog.length} stores — expected the Israel list`)
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: country, error: countryErr } = await supabase
  .from('countries')
  .select('id')
  .eq('code', countryCode)
  .maybeSingle()
if (countryErr || !country) {
  console.error(countryErr?.message || `Country ${countryCode} not found`)
  process.exit(1)
}

const { data: stores, error: storeErr } = await supabase
  .from('stores')
  .select('id, code')
  .eq('country_id', country.id)
if (storeErr) {
  console.error(storeErr.message)
  process.exit(1)
}
const storeByCode = new Map((stores ?? []).map((store) => [store.code, store]))

const { data: phones, error: phoneErr } = await supabase
  .from('store_phones')
  .select('wa_id, store_id, stores(code)')
if (phoneErr) {
  console.error(phoneErr.message)
  process.exit(1)
}

const existing = (phones ?? []).map((row) => {
  const joined = row.stores
  const code = Array.isArray(joined) ? joined[0]?.code : joined?.code
  return { waId: row.wa_id, storeCode: code || '' }
})

const plan = planManagerPhones({
  stores: catalog,
  blockedPhones: [ARI_PHONE, TEST_DESK_PHONE],
  existing,
})

const counts = {}
for (const row of plan) counts[row.reason] = (counts[row.reason] ?? 0) + 1
console.log(apply ? 'apply' : 'dry-run', counts)

for (const row of plan) {
  if (row.action !== 'link') {
    console.log(`skip ${row.storeCode} ${row.reason} ${row.waId ?? ''}`)
    continue
  }
  const store = storeByCode.get(row.storeCode)
  if (!store) {
    console.log(`skip ${row.storeCode} store_missing ${row.waId}`)
    continue
  }
  if (!apply) {
    console.log(`link ${row.storeCode} ${row.managerName} ${row.waId}`)
    continue
  }
  const { error } = await supabase.from('store_phones').insert({
    store_id: store.id,
    wa_id: row.waId,
    is_primary: true,
    label: row.managerName || 'manager',
  })
  if (error) console.error(`fail ${row.storeCode} ${row.waId}: ${error.message}`)
  else console.log(`linked ${row.storeCode} ${row.waId}`)
}
