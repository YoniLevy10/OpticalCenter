import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('RLS policy scanner', () => {
  const initial = path.join(
    process.cwd(),
    'supabase/migrations/20260815220000_initial_schema.sql',
  )
  const p0 = path.join(
    process.cwd(),
    'supabase/migrations/20260815230000_p0_rls_hierarchy_france.sql',
  )

  it('P0 migration drops blanket using (true) ticket policies', () => {
    const sql = fs.readFileSync(p0, 'utf8')
    expect(sql).toContain('drop policy if exists tickets_read_authenticated')
    expect(sql).toContain('tickets_select_scoped')
    expect(sql).toContain('can_read_ticket')
    expect(sql).toContain('global_admin')
    expect(sql).not.toMatch(
      /create policy tickets_read_authenticated[\s\S]*using \(true\)/,
    )
  })

  it('P0 migration drops stores blanket policy', () => {
    const sql = fs.readFileSync(p0, 'utf8')
    expect(sql).toContain('drop policy if exists stores_read_authenticated')
    expect(sql).toContain('stores_select_scoped')
  })

  it('initial bootstrap policies are superseded by later migration', () => {
    const bootstrap = fs.readFileSync(initial, 'utf8')
    expect(bootstrap).toContain('using (true)')
    const fix = fs.readFileSync(p0, 'utf8')
    expect(fix).toContain('drop policy if exists tickets_read_authenticated')
  })
})
