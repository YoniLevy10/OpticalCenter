import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { confirmStoreFix } from '@/modules/tickets/store-confirm'
import { getById } from '@/modules/tickets/service'
import { captureError } from '@/lib/monitoring'

export const runtime = 'nodejs'

/**
 * Store confirms a resolved ticket → auto-close.
 * Allowed for demo entry without login (meeting demo) or authenticated store/HQ.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    let actorLabel = 'store'
    try {
      const actor = await requireActor(request)
      actorLabel =
        actor.full_name || actor.email || actor.id || 'store'
    } catch (err) {
      if (!(err instanceof AuthError) || !shouldAllowDemoEntry()) {
        if (err instanceof AuthError) return authErrorResponse(err)
        throw err
      }
      actorLabel = 'demo-store'
    }

    const ticket = await getById(id)
    if (!ticket) {
      return NextResponse.json({ error: 'תקלה לא נמצאה' }, { status: 404 })
    }

    const result = await confirmStoreFix({
      ticketId: id,
      actorLabel,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    captureError(err, { route: 'POST /api/tickets/[id]/confirm' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
