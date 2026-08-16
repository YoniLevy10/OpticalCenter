import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { createAsset, listAssets } from '@/modules/assets/service'
import { captureError } from '@/lib/monitoring'

const createSchema = z.object({
  store_id: z.string().min(1),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  asset_type: z.string().max(64).optional(),
})

export async function GET(request: Request) {
  try {
    await requireActor(request)
    const url = new URL(request.url)
    const storeId = url.searchParams.get('store') || undefined
    const { assets, backend } = await listAssets({ storeId })
    return NextResponse.json({ assets, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/assets' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    const can =
      actor.memberships.some((m) =>
        ['global_admin', 'country_manager', 'global_maintenance'].includes(
          m.role,
        ),
      ) || process.env.MAINTAINOS_FORCE_MEMORY === '1'
    if (!can) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const asset = await createAsset(parsed.data)
    return NextResponse.json({ asset }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/assets' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
