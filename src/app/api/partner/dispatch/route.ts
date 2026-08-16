import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { dispatchToVendor } from '@/modules/vendors/dispatch'
import { captureError } from '@/lib/monitoring'

const schema = z.object({
  ticketId: z.string().min(1),
  vendorId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(120),
  note: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const dispatch = await dispatchToVendor({
      ...parsed.data,
      actorId: actor.id,
    })
    return NextResponse.json({ dispatch }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/partner/dispatch' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
