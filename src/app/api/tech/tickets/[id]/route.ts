import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { TICKET_STATUSES } from '@/modules/tickets/constants'
import { canTechTransition, isUuid } from '@/modules/tickets/tech'
import { getTechTicket, patchTechTicket } from '@/modules/tech/service'
import { supabaseReady } from '@/lib/data/memory-store'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  techId: z.string().min(1),
  status: z.enum(TICKET_STATUSES).optional(),
  note: z.string().max(4000).optional(),
  resolution_note: z.string().max(4000).optional(),
  photoUrl: z
    .string()
    .optional()
    .refine((v) => !v || v === '' || /^https?:\/\//i.test(v), {
      message: 'photoUrl must be http(s) URL',
    }),
  claim: z.boolean().optional(),
})

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: ticketId } = await context.params
  if (!isUuid(ticketId)) {
    return NextResponse.json({ error: 'מזהה תקלה לא תקין' }, { status: 400 })
  }
  try {
    const ticket = await getTechTicket(ticketId)
    if (!ticket) {
      return NextResponse.json({ error: 'תקלה לא נמצאה' }, { status: 404 })
    }
    return NextResponse.json({ ticket })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'server_error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: ticketId } = await context.params
  if (!isUuid(ticketId)) {
    return NextResponse.json({ error: 'מזהה תקלה לא תקין' }, { status: 400 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { techId, status, note, resolution_note, photoUrl, claim } = parsed.data
  if (!isUuid(techId)) {
    return NextResponse.json({ error: 'מזהה טכנאי לא תקין' }, { status: 400 })
  }

  const resolvedNote = resolution_note?.trim() || note?.trim() || undefined

  if (!status && !claim && !resolvedNote && !photoUrl) {
    return NextResponse.json(
      { error: 'יש לספק סטטוס, הערה, תמונה או claim' },
      { status: 400 },
    )
  }

  // Prefer resilient ticket-service path (supabase or memory).
  if (!(await supabaseReady())) {
    try {
      const ticket = await patchTechTicket({
        ticketId,
        techId,
        status,
        resolution_note: resolvedNote,
        claim,
      })
      return NextResponse.json({ ok: true, ticket })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'server_error'
      const code =
        message.includes('לא נמצאה') || message.includes('אינו מותר')
          ? 400
          : message.includes('הרשאה') || message.includes('משויכת')
            ? 403
            : 500
      return NextResponse.json({ error: message }, { status: code })
    }
  }

  try {
    const supabase = createAdminClient()

    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('id, status, assigned_to')
      .eq('id', ticketId)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }
    if (!ticket) {
      return NextResponse.json({ error: 'תקלה לא נמצאה' }, { status: 404 })
    }

    const currentStatus = ticket.status as (typeof TICKET_STATUSES)[number]
    const updates: Record<string, unknown> = {}
    const eventPayload: Record<string, unknown> = { tech_id: techId }
    let eventType = 'tech_note'

    if (claim || (!ticket.assigned_to && status)) {
      if (ticket.assigned_to && ticket.assigned_to !== techId) {
        return NextResponse.json(
          { error: 'התקלה כבר משויכת לטכנאי אחר' },
          { status: 409 },
        )
      }
      updates.assigned_to = techId
      eventPayload.claimed = true
      eventType = 'tech_claim'
    } else if (ticket.assigned_to && ticket.assigned_to !== techId) {
      return NextResponse.json(
        { error: 'אין הרשאה לעדכן תקלה של טכנאי אחר' },
        { status: 403 },
      )
    } else if (!ticket.assigned_to && !claim) {
      if (status || photoUrl) {
        return NextResponse.json(
          { error: 'יש לתפוס את העבודה (claim) לפני עדכון' },
          { status: 400 },
        )
      }
    }

    if (status) {
      if (status !== currentStatus && !canTechTransition(currentStatus, status)) {
        return NextResponse.json(
          { error: `מעבר מ-${currentStatus} ל-${status} אינו מותר` },
          { status: 400 },
        )
      }
      if (status !== currentStatus) {
        updates.status = status
        eventPayload.from_status = currentStatus
        eventPayload.to_status = status
        eventType = 'status_change'
        if (status === 'resolved') {
          updates.resolved_at = new Date().toISOString()
        }
      }
      if (!ticket.assigned_to) {
        updates.assigned_to = techId
      }
    }

    if (resolvedNote) {
      eventPayload.note = resolvedNote
      eventPayload.resolution_note = resolvedNote
      if (eventType !== 'tech_claim' && eventType !== 'status_change') {
        eventType = 'tech_note'
      }
    }

    if (photoUrl && photoUrl.length > 0) {
      const { error: attError } = await supabase.from('ticket_attachments').insert({
        ticket_id: ticketId,
        url: photoUrl,
        kind: 'image',
      })
      if (attError) {
        return NextResponse.json(
          { error: `שמירת תמונה נכשלה: ${attError.message}` },
          { status: 500 },
        )
      }
      eventPayload.photo_url = photoUrl
      if (eventType === 'tech_note') eventType = 'tech_photo'
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    const actorId = await resolveActorId(supabase, techId)

    const { error: eventError } = await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: eventType,
      actor_id: actorId,
      payload: eventPayload,
    })

    if (eventError) {
      return NextResponse.json(
        { error: `עדכון נשמר אך אירוע נכשל: ${eventError.message}` },
        { status: 500 },
      )
    }

    const { data: refreshed } = await supabase
      .from('tickets')
      .select('id, status, assigned_to, updated_at, resolved_at, display_number, number')
      .eq('id', ticketId)
      .single()

    return NextResponse.json({ ok: true, ticket: refreshed })
  } catch (e) {
    // Fall back to memory/service path if supabase path throws
    try {
      const ticket = await patchTechTicket({
        ticketId,
        techId,
        status,
        resolution_note: resolvedNote,
        claim,
      })
      return NextResponse.json({ ok: true, ticket })
    } catch {
      const message = e instanceof Error ? e.message : 'server_error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}

async function resolveActorId(
  supabase: ReturnType<typeof createAdminClient>,
  techId: string,
): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('id').eq('id', techId).maybeSingle()
  return data?.id ?? null
}
