import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { createServiceVisit } from '@/modules/visits/service'
import { captureError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  storeId: z.string().min(1),
  ticketIds: z.array(z.string().min(1)).min(1).max(40),
  vendorId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
  retryFailedOnly: z.boolean().optional(),
  retryTicketIds: z.array(z.string().min(1)).max(40).optional(),
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
      idempotencyKey: parsed.data.idempotencyKey ?? null,
      retryFailedOnly: parsed.data.retryFailedOnly ?? false,
      retryTicketIds: parsed.data.retryTicketIds ?? null,
    })

    const failedCount = visit.items.filter((i) => i.can_retry).length
    const httpStatus =
      visit.status === 'partial' || failedCount > 0 ? 207 : 201

    return NextResponse.json({ visit }, { status: httpStatus })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'יצירת ביקור נכשלה'
    captureError(err, { route: 'POST /api/ops/visits' })
    const status =
      message.includes('נדרש') ||
      message.includes('לבחור') ||
      message.includes('אותה חנות') ||
      message.includes('לא נמצאה') ||
      message.includes('לא זמין') ||
      message.includes('אינו מתאים')
        ? 400
        : message.includes('אין נפילה שקטה') || message.includes('מיגרציה')
          ? 503
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
