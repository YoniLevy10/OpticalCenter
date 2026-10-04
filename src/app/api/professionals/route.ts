import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import {
  listProfessionals,
  upsertProfessional,
} from '@/modules/professionals/service'
import { captureError } from '@/lib/monitoring'

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const url = new URL(request.url)
    const tradeQuery = url.searchParams.get('q')
    const { professionals, backend } = await listProfessionals({
      tradeQuery,
      limit: 50,
    })
    return NextResponse.json({ professionals, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/professionals' })
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
    const body = (await request.json()) as {
      full_name?: string
      phone?: string | null
      trade?: string | null
      midrag_sector_id?: number | null
      midrag_service_id?: number | null
      company_name?: string | null
      notes?: string | null
      source?: 'manual' | 'midrag' | 'vendor'
    }
    if (!body.full_name?.trim()) {
      return NextResponse.json({ error: 'שם חובה' }, { status: 400 })
    }
    const { professional, backend } = await upsertProfessional({
      full_name: body.full_name,
      phone: body.phone,
      trade: body.trade,
      midrag_sector_id: body.midrag_sector_id,
      midrag_service_id: body.midrag_service_id,
      company_name: body.company_name,
      notes: body.notes,
      source: body.source ?? 'midrag',
    })
    return NextResponse.json({ professional, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/professionals' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}
