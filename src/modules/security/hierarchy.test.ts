import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Hierarchy / data integrity constraints', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260815220000_initial_schema.sql'),
    'utf8',
  )

  it('tickets reference store and region/country/org columns exist', () => {
    expect(migration).toMatch(/create table public\.tickets/)
    expect(migration).toMatch(/store_id/)
    expect(migration).toMatch(/region_id/)
    expect(migration).toMatch(/country_id/)
    expect(migration).toMatch(/organization_id/)
  })

  it.fails('DB should enforce store.region belongs to same country as ticket', () => {
    // No composite FK / trigger found in initial schema for cross-country prevention
    expect(migration).toMatch(/prevent_cross_country|ticket_hierarchy|same_country/i)
  })
})
