#!/usr/bin/env node
/**
 * Purge demo tickets (source=demo) from Supabase.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node scripts/purge-demo-tickets.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data, error } = await supabase
  .from('tickets')
  .delete()
  .eq('source', 'demo')
  .select('id, display_number, title')

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Deleted ${data?.length ?? 0} demo ticket(s)`)
for (const row of data ?? []) {
  console.log(` - ${row.display_number ?? row.id} ${row.title ?? ''}`.trim())
}
