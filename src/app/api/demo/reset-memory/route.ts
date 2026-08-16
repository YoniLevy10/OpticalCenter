import { NextResponse } from 'next/server'
import { memReset } from '@/lib/data/memory-store'

export const dynamic = 'force-dynamic'

/**
 * QA helper: clear the in-memory ticket store so visual / e2e suites start clean.
 * Only available when FORCE_MEMORY or ALLOW_TEST_AUTH is set.
 */
export async function POST() {
  const allowed =
    process.env.MAINTAINOS_FORCE_MEMORY === '1' ||
    process.env.MAINTAINOS_ALLOW_TEST_AUTH === '1'
  if (!allowed) {
    return NextResponse.json({ error: 'not_available' }, { status: 404 })
  }
  memReset()
  return NextResponse.json({ ok: true, reset: true })
}

export async function GET() {
  return POST()
}
