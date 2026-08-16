import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { listTickets } from '@/modules/tickets/service'
import { createTicket } from '@/modules/tickets/service'
import { TICKET_PRIORITIES } from '@/modules/tickets/constants'
import { captureError } from '@/lib/monitoring'
import { resolveTicketsSupabase } from '@/lib/supabase/tickets-client'

const createSchema = z.object({
  storeId: z.string().uuid().optional(),
  storeCode: z.string().min(1).max(16).optional(),
  countryCode: z.string().min(2).max(8).optional(),
  description: z.string().min(1),
  title: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  source: z
    .enum(['whatsapp', 'qr_whatsapp', 'nfc_whatsapp', 'web_fallback', 'demo'])
    .optional(),
  reporterPhone: z.string().optional(),
  reporterName: z.string().optional(),
  language: z.string().optional(),
  assetId: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) {
      throw new AuthError('אין הרשאת HQ', 403)
    }
    const url = new URL(request.url)
    const resolved = await resolveTicketsSupabase(actor)
    const { tickets, backend, mode } = await listTickets({
      limit: Math.min(Number(url.searchParams.get('limit') || '200') || 200, 1000),
      status: url.searchParams.get('status') || undefined,
      priority: url.searchParams.get('priority') || undefined,
      storeCode: url.searchParams.get('store') || undefined,
      assignedTo: url.searchParams.get('tech') || undefined,
      q: url.searchParams.get('q') || undefined,
      client: resolved?.client,
    })
    return NextResponse.json({ tickets, backend, mode })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/tickets' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) {
      throw new AuthError('אין הרשאת HQ', 403)
    }
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    if (!parsed.data.storeId && !parsed.data.storeCode) {
      return NextResponse.json(
        { error: 'יש לציין storeId או storeCode' },
        { status: 400 },
      )
    }

    const ticket = await createTicket(parsed.data)
    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת תקלה'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
