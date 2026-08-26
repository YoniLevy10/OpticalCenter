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
    const { messages, ticketIds, backend } = await listSessionMessages(waId)
    return NextResponse.json({ messages, ticketIds, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/inbox/sessions/[waId]' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

const replySchema = z.object({
  text: z.string().min(1).max(4096),
  ticketId: z.string().uuid().optional().nullable(),
  countryId: z.string().uuid().optional(),
})

export async function POST(
  request: Request,
  ctx: { params: Promise<{ waId: string }> },
) {
  try {
    await requireActor(request)
    const { waId } = await ctx.params
    const parsed = replySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const result = await replyToSession({
      waId,
      text: parsed.data.text,
      ticketId: parsed.data.ticketId,
      countryId: parsed.data.countryId,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/inbox/sessions/[waId]' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
