import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TICKET_STATUSES } from '@/modules/tickets/constants'
import { isUuid } from '@/modules/tickets/tech'
import { getTechTicket, patchTechTicket } from '@/modules/tech/service'
import { getById } from '@/modules/tickets/service'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import {
  AuthError,
  actorIsTech,
  actorPrimaryTechId,
  canTechActOnTicket,
  canReadTicket,
} from '@/lib/auth/types'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  note: z.string().max(4000).optional(),
  resolution_note: z.string().max(4000).optional(),
  photoUrl: z
    .string()
    .max(320_000)
    .optional()
    .refine(
      (v) =>
        !v ||
        v === '' ||
        /^https?:\/\//i.test(v) ||
        /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(v),
      {
        message: 'photoUrl must be http(s) or compressed data:image URL',
      },
    ),
  claim: z.boolean().optional(),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    if (!actorIsTech(actor)) {
      throw new AuthError('אין הרשאת טכנאי', 403)
    }
    const { id: ticketId } = await context.params
    if (!isUuid(ticketId)) {
      return NextResponse.json({ error: 'מזהה תקלה לא תקין' }, { status: 400 })
    }
    const full = await getById(ticketId)
    if (!full) {
      return NextResponse.json({ error: 'תקלה לא נמצאה' }, { status: 404 })
    }
    if (!canReadTicket(actor, full) && !canTechActOnTicket(actor, full)) {
      throw new AuthError('אין גישה לתקלה זו', 403)
    }
    const ticket = await getTechTicket(ticketId)
    return NextResponse.json({ ticket })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    if (!actorIsTech(actor)) {
      throw new AuthError('אין הרשאת טכנאי', 403)
    }
    const techId = actorPrimaryTechId(actor)!
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

    // Ignore any client-supplied techId — session is source of truth
    const { status, note, resolution_note, photoUrl, claim } = parsed.data
    const resolvedNote = resolution_note?.trim() || note?.trim() || undefined

    if (!status && !claim && !resolvedNote && !photoUrl) {
      return NextResponse.json(
        { error: 'יש לספק סטטוס, הערה, תמונה או claim' },
        { status: 400 },
      )
    }

    const full = await getById(ticketId)
    if (!full) {
      return NextResponse.json({ error: 'תקלה לא נמצאה' }, { status: 404 })
    }
    if (!canTechActOnTicket(actor, full) && !(claim && !full.assigned_to)) {
      throw new AuthError('אין הרשאה לעדכן תקלה זו', 403)
    }

    const ticket = await patchTechTicket({
      ticketId,
      techId,
      status,
      resolution_note: resolvedNote,
      claim,
      photoUrl,
    })
    return NextResponse.json({ ok: true, ticket })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'server_error'
    const code =
      message.includes('לא נמצאה') || message.includes('אינו מותר')
        ? 400
        : message.includes('הרשאה') || message.includes('משויכת')
          ? 403
          : 500
    return NextResponse.json({ error: message }, { status: code })
  }
}
