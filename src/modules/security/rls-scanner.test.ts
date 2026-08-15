import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('RLS policy scanner', () => {
  const migration = path.join(
    process.cwd(),
    'supabase/migrations/20260815220000_initial_schema.sql',
  )

  it('documents current permissive authenticated policies', () => {
    const sql = fs.readFileSync(migration, 'utf8')
    const matches = sql.match(/to authenticated using \(true\)/gi) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it.fails('tickets must not use blanket authenticated using (true)', () => {
    const sql = fs.readFileSync(migration, 'utf8')
    expect(sql).not.toContain(
      'create policy tickets_read_authenticated on public.tickets\n  for select to authenticated using (true);',
    )
  })

  it.fails('stores must not use blanket authenticated using (true)', () => {
    const sql = fs.readFileSync(migration, 'utf8')
    expect(sql).not.toContain(
      'create policy stores_read_authenticated on public.stores\n  for select to authenticated using (true);',
    )
  })
})
