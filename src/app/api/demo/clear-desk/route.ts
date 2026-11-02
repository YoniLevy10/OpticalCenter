import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { clearDeskMemory } from '@/lib/data/memory-store'
import { resetEngagementsForTests } from '@/modules/engagements/service'

export const dynamic = 'force-dynamic'

/** Local wipe of the in-memory desk. Production data is cleared in the database, not here. */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_available' }, { status: 404 })
  }
  clearDeskMemory()
  resetEngagementsForTests()
  const dir = join(process.cwd(), '.local')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'desk-cleared'), new Date().toISOString())
  return NextResponse.json({ ok: true })
}
