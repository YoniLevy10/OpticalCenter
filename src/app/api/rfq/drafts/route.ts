import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { createRfqDraft, listRfqDrafts } from '@/modules/rfq/service'
import { captureError } from '@/lib/monitoring'

const createSchema = z.object({
  store_id: z.string().nullable().optional(),
  store_code: z.string().nullable().optional(),
  store_name: z.string().nullable().optional(),
  trade: z.string().min(1).max(120),
  ticket_ids: z.array(z.string().min(1)).min(1).max(40),
  document_notes: z.array(z.string().max(400)).max(20).optional(),
  timing_note: z.string().max(400).nullable().optional(),
  recipient_hints: z.array(z.string().max(200)).max(20).optional(),
  body_text: z.string().max(8000).nullable().optional(),
})

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const url = new URL(request.url)
    const ticketId = url.searchParams.get('ticketId') ?? undefined
    const { drafts, backend } = await listRfqDrafts({ ticketId })
    return NextResponse.json({ drafts, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/rfq/drafts' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const { draft, backend } = await createRfqDraft({
      ...parsed.data,
      created_by: actor.id,
    })
    return NextResponse.json({ draft, backend }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/rfq/drafts' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
