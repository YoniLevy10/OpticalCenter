import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assign, getById, updateStatus, type TicketRecord } from '@/modules/tickets/service'
import { TICKET_STATUSES } from '@/modules/tickets/constants'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import {
  AuthError,
  actorHasHqAccess,
  canMutateHqTicket,
} from '@/lib/auth/types'

const patchSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .refine((v) => v.status != null || v.assignedTo != null, {
    message: 'יש לציין status או assignedTo',
  })

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) {
      throw new AuthError('אין הרשאת HQ', 403)
    }

    const { id } = await context.params
    const existing = await getById(id)
    if (!existing) {
      return NextResponse.json({ error: 'תקלה לא נמצאה' }, { status: 404 })
    }
    if (!canMutateHqTicket(actor, existing)) {
      throw new AuthError('אין הרשאה לעדכן תקלה זו', 403)
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    let ticket: TicketRecord = existing
    if (parsed.data.assignedTo) {
      ticket = await assign(id, parsed.data.assignedTo, actor.id)
    }
    if (parsed.data.status) {
      ticket = await updateStatus(id, parsed.data.status, actor.id)
    }

    return NextResponse.json({ ticket })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון תקלה'
    const status =
      message.includes('לא חוקי') || message.includes('לא נמצאה') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
