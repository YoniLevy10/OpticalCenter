import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import {
  listSessionMessages,
  replyToSession,
} from '@/modules/inbox/service'
import { captureError } from '@/lib/monitoring'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ waId: string }> },
) {
  try {
    await requireActor(request)
    const { waId } = await ctx.params
    const { messages, ticketIds, openTickets, context, backend } =
      await listSessionMessages(waId)
    return NextResponse.json({
      messages,
      ticketIds,
      openTickets,
      context,
      backend,
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/inbox/sessions/[waId]' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

/**
 * Pilot is Israel-only for now.
 * Ignore countryId entirely (clients may still send "null" / garbage).
 */
const replySchema = z.object({
  text: z.string().min(1).max(4096),
  ticketId: z.preprocess((value) => {
    if (
      value == null ||
      value === '' ||
      value === 'null' ||
      value === 'undefined'
    ) {
      return null
    }
    return value
  }, z.string().uuid().nullable().optional()),
  // Accepted but ignored — Israel is resolved server-side.
  countryId: z.any().optional(),
})

export async function POST(
  request: Request,
  ctx: { params: Promise<{ waId: string }> },
) {
  try {
    await requireActor(request)
    const { waId } = await ctx.params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'גוף בקשה לא תקין (JSON)' }, { status: 400 })
    }

    const parsed = replySchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const field = issue?.path?.join('.') || 'payload'
      return NextResponse.json(
        {
          error: `בקשה לא תקינה (${field}): ${issue?.message || 'validation'}`,
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const result = await replyToSession({
      waId,
      text: parsed.data.text,
      ticketId: parsed.data.ticketId ?? null,
      // Israel-only pilot: never trust client countryId.
      countryId: undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/inbox/sessions/[waId]' })
    const message = err instanceof Error ? err.message : 'שגיאה'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
