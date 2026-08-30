import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { purgeDemoTickets } from '@/modules/tickets/service'
import { captureError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/tickets/purge-demo
 * Removes all tickets with source=demo (messages/events cascade).
 * Restricted to global_admin / global_maintenance.
 */
export async function DELETE(request: Request) {
  try {
    const actor = await requireActor(request)
    const allowed = actor.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'global_maintenance',
    )
    if (!allowed) {
      throw new AuthError('אין הרשאה למחיקת תקלות דמו', 403)
    }
    const result = await purgeDemoTickets()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'DELETE /api/tickets/purge-demo' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return DELETE(request)
}
