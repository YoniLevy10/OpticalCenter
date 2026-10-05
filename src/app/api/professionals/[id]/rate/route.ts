import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { rateProfessional } from '@/modules/professionals/service'
import { captureError } from '@/lib/monitoring'

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const { id } = await ctx.params
    const body = (await request.json().catch(() => ({}))) as { rating?: number }
    const rating = Number(body.rating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'דירוג בין 1 ל-5' }, { status: 400 })
    }
    const { professional, backend } = await rateProfessional(id, rating)
    if (!professional) {
      return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
    }
    return NextResponse.json({ professional, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/professionals/[id]/rate' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}
