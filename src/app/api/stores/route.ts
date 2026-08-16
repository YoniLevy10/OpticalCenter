import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import {
  createStore,
  listStores,
  requireStoresMutate,
} from '@/modules/stores/service'
import { MEM_COUNTRY_ID, MEM_ORG_ID } from '@/lib/data/memory-store'
import { captureError } from '@/lib/monitoring'

const createSchema = z.object({
  code: z.string().min(1).max(6),
  name: z.string().min(1).max(120),
  city: z.string().max(120).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  region_id: z.string().max(64).optional(),
  country_id: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    await requireActor(request)
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === '1'
    const { stores, backend } = await listStores({ includeInactive })
    return NextResponse.json({ stores, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/stores' })
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת חנויות'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    requireStoresMutate(actor)
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Memory / IL pilot defaults when omitted
    const countryMembership = actor.memberships.find(
      (m) => m.role === 'country_manager' && m.country_id,
    )
    const store = await createStore({
      ...parsed.data,
      country_id:
        parsed.data.country_id ??
        countryMembership?.country_id ??
        MEM_COUNTRY_ID,
      organization_id:
        parsed.data.organization_id ??
        actor.memberships[0]?.organization_id ??
        MEM_ORG_ID,
      region_id: parsed.data.region_id ?? 'ta',
    })
    return NextResponse.json({ store }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/stores' })
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת חנות'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
