import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assign, updateStatus } from '@/modules/tickets/service'
import { TICKET_STATUSES } from '@/modules/tickets/constants'

const patchSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    assignedTo: z.string().uuid().optional(),
    actorId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.status != null || v.assignedTo != null, {
    message: 'יש לציין status או assignedTo',
  })

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    let ticket = null
    if (parsed.data.assignedTo) {
      ticket = await assign(id, parsed.data.assignedTo, parsed.data.actorId)
    }
    if (parsed.data.status) {
      ticket = await updateStatus(id, parsed.data.status, parsed.data.actorId)
    }

    return NextResponse.json({ ticket })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון תקלה'
    const status =
      message.includes('לא חוקי') || message.includes('לא נמצאה') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
