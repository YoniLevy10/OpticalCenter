#!/usr/bin/env node
/**
 * Apply a single migration file (default: WhatsApp AI intake).
 *
 *   SUPABASE_DB_PASSWORD=... node scripts/apply-migration.mjs
 *   SUPABASE_DB_PASSWORD=... node scripts/apply-migration.mjs 20260827230000_whatsapp_ai_intake.sql
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ref = process.env.SUPABASE_PROJECT_REF || 'pfsxuylbnpbcgjehuaqo'
const password = process.env.SUPABASE_DB_PASSWORD
const fileName =
  process.argv[2] || '20260827230000_whatsapp_ai_intake.sql'
const filePath = join(process.cwd(), 'supabase', 'migrations', fileName)

if (!password) {
  console.error(`
Missing SUPABASE_DB_PASSWORD.

Manual (Supabase SQL Editor):
  https://supabase.com/dashboard/project/${ref}/sql/new
  Paste: supabase/migrations/${fileName}
`)
  process.exit(1)
}

if (!existsSync(filePath)) {
  console.error(`Migration not found: ${filePath}`)
  process.exit(1)
}

let pg
try {
  pg = await import('pg')
} catch {
  console.error('Install pg first: npm i pg')
  process.exit(1)
}

const host =
  process.env.SUPABASE_DB_HOST || 'aws-1-eu-west-1.pooler.supabase.com'
const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:6543/postgres`
const client = new pg.default.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
try {
  const sql = readFileSync(filePath, 'utf8')
  console.log(`Applying ${fileName}...`)
  await client.query(sql)
  console.log(`OK ${fileName}`)
} finally {
  await client.end()
}
