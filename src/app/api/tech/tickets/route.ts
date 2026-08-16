import { NextResponse } from 'next/server'
import { listTechTickets } from '@/modules/tech/service'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorIsTech, actorPrimaryTechId } from '@/lib/auth/types'

export const dynamic = 'force-dynamic'

/** GET /api/tech/tickets — jobs for the authenticated technician only. */
export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorIsTech(actor)) {
      throw new AuthError('אין הרשאת טכנאי', 403)
    }
    const techId = actorPrimaryTechId(actor)
    const { tickets, backend } = await listTechTickets({ techId })
    // Extra filter: only assigned to self (or claimable assigned-unassigned pool already in service)
    const scoped = tickets.filter(
      (t) =>
        t.assigned_to === techId ||
        (!t.assigned_to && t.status === 'assigned'),
    )
    return NextResponse.json({ tickets: scoped, backend, techId })
  } catch (err) {
    return authErrorResponse(err)
  }
}
