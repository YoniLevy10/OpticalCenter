import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { createVendor, listVendors } from '@/modules/vendors/service'
import { captureError } from '@/lib/monitoring'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  contact_phone: z.string().max(32).nullable().optional(),
  contact_email: z.string().max(120).nullable().optional(),
  specialties: z.string().max(64).optional(),
  webhook_url: z.string().url().nullable().optional().or(z.literal('')),
})

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const url = new URL(request.url)
    const activeOnly = url.searchParams.get('active') === '1'
    const { vendors, backend } = await listVendors({ activeOnly })
    return NextResponse.json({ vendors, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/vendors' })
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
    const vendor = await createVendor({
      ...parsed.data,
      webhook_url: parsed.data.webhook_url || null,
    })
    return NextResponse.json({ vendor }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/vendors' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
