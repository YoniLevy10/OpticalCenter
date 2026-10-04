import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { touchProfessional } from '@/modules/professionals/service'
import { captureError } from '@/lib/monitoring'

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const { id } = await ctx.params
    const { professional, backend } = await touchProfessional(id)
    if (!professional) {
      return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
    }
    return NextResponse.json({ professional, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/professionals/[id]/touch' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}