import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { listRecentAuditEvents } from '@/modules/audit/service'
import { captureError } from '@/lib/monitoring'

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || '80') || 80, 200)
    const { events, backend } = await listRecentAuditEvents(limit)
    return NextResponse.json({ events, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/audit' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}
