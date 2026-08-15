#!/usr/bin/env node
/**
 * Apply MaintainOS SQL migrations via Postgres when SUPABASE_DB_PASSWORD is set.
 *
 *   SUPABASE_DB_PASSWORD=... node scripts/apply-migrations.mjs
 *
 * Requires optional dependency: npm i pg
 * Service role JWT cannot run DDL via PostgREST — password (or SQL Editor) is required.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ref = process.env.SUPABASE_PROJECT_REF || 'pfsxuylbnpbcgjehuaqo'
const password = process.env.SUPABASE_DB_PASSWORD
const dir = join(process.cwd(), 'supabase', 'migrations')
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

if (!password) {
  console.error(`
Missing SUPABASE_DB_PASSWORD.

Manual path:
  1. https://supabase.com/dashboard/project/${ref}/sql/new
  2. Paste files in order:
${files.map((f) => `     - supabase/migrations/${f}`).join('\n')}

Or:
  npm i pg
  SUPABASE_DB_PASSWORD=... node scripts/apply-migrations.mjs

Until migrations run, MaintainOS uses in-memory fallback for demos.
`)
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
  process.env.SUPABASE_DB_HOST ||
  // Optical Center project region (IPv4 pooler). Override if needed.
  `aws-1-eu-west-1.pooler.supabase.com`
const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:6543/postgres`

const client = new pg.default.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
try {
  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8')
    console.log(`Applying ${file}...`)
    await client.query(sql)
    console.log(`OK ${file}`)
  }
  console.log('All migrations applied.')
} finally {
  await client.end()
}
