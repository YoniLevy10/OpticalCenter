import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { createServiceVisit } from '@/modules/visits/service'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  storeId: z.string().uuid(),
  ticketIds: z.array(z.string().uuid()).min(1).max(40),
  vendorId: z.string().uuid(),
  notes: z.string().trim().max(2000).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) {
      throw new AuthError('אין הרשאת HQ', 403)
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const visit = await createServiceVisit({
      storeId: parsed.data.storeId,
      ticketIds: parsed.data.ticketIds,
      vendorId: parsed.data.vendorId,
      actorId: actor.id,
      notes: parsed.data.notes ?? null,
      scheduledAt: parsed.data.scheduledAt ?? null,
    })

    return NextResponse.json({ visit })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'יצירת ביקור נכשלה'
    const status =
      message.includes('נדרש') ||
      message.includes('לבחור') ||
      message.includes('אותה חנות') ||
      message.includes('לא נמצאה')
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
