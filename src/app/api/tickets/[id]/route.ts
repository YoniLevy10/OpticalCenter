import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  assign,
  getById,
  listInternalTechnicians,
  updateStatus,
  type TicketRecord,
} from '@/modules/tickets/service'
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
import { isLifecycleEvent } from '@/modules/notifications/lifecycle'
import {
  notifyReporter,
  notifyTechnicianAssigned,
} from '@/modules/notifications/lifecycle-notify'
import { DEMO_TECH_ID, memDemoTechnicians } from '@/lib/data/memory-store'
import { logEvent } from '@/lib/logging'

const patchSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    assignedTo: z.string().uuid().optional(),
  })
  .refine((v) => v.status != null || v.assignedTo != null, {
    message: 'יש לציין status או assignedTo',
  })

async function resolveTechProfile(assignedTo: string) {
  const techs = await listInternalTechnicians()
  const fromList = techs.find((t) => t.id === assignedTo)
  if (fromList && 'phone' in fromList && fromList.phone) {
    return fromList as {
      id: string
      full_name: string | null
      email: string | null
      phone?: string | null
    }
  }
  const mem = memDemoTechnicians().find((t) => t.id === assignedTo)
  if (mem) {
    return {
      id: mem.id,
      full_name: mem.full_name,
      email: mem.email,
      phone: 'phone' in mem ? (mem as { phone?: string }).phone ?? null : null,
    }
  }
  // Fallback: demo tech id known from seed
  if (assignedTo === DEMO_TECH_ID) {
    return {
      id: DEMO_TECH_ID,
      full_name: 'יוסי כהן',
      email: 'yossi.cohen@optical-center.demo',
      phone: '+972501000001',
    }
  }
  return fromList
    ? { ...fromList, phone: null }
    : { id: assignedTo, full_name: null, email: null, phone: null }
}

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
    let assignedTechId: string | null = null

    if (parsed.data.assignedTo) {
      ticket = await assign(id, parsed.data.assignedTo, actor.id)
      assignedTechId = parsed.data.assignedTo
    }
    if (parsed.data.status) {
      ticket = await updateStatus(id, parsed.data.status, actor.id)
    }

    // Refresh detail for templates (store name, assignee).
    const detail = (await getById(id)) ?? { ...ticket, stores: null, assignee: null }

    try {
      if (assignedTechId) {
        const tech = await resolveTechProfile(assignedTechId)
        await notifyTechnicianAssigned(
          {
            ...detail,
            assigned_to: assignedTechId,
          },
          tech,
        )
      }

      const lifecycleStatus =
        parsed.data.status && isLifecycleEvent(parsed.data.status)
          ? parsed.data.status
          : assignedTechId && detail.status === 'assigned'
            ? 'assigned'
            : null

      if (lifecycleStatus) {
        await notifyReporter(detail, lifecycleStatus)
      }
    } catch (e) {
      logEvent('api:tickets', 'warn', 'lifecycle_notify_failed', {
        ticketId: id,
        error: e instanceof Error ? e.message : String(e),
      })
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
