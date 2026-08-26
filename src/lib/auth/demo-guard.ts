import { NextResponse } from 'next/server'
import { testAuthAllowed } from '@/lib/auth/types'

/** Demo / QA API routes — unavailable in production runtime. */
export function demoRouteBlocked(): NextResponse | null {
  if (testAuthAllowed()) return null
  return NextResponse.json({ error: 'not_available' }, { status: 404 })
}
