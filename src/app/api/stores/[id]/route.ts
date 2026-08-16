import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { requireStoresMutate, updateStore } from '@/modules/stores/service'
import { captureError } from '@/lib/monitoring'

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  city: z.string().max(120).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  region_id: z.string().max(64).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    requireStoresMutate(actor)
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'חסר מזהה חנות' }, { status: 400 })
    }
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 })
    }
    const store = await updateStore(id, parsed.data)
    return NextResponse.json({ store })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'PATCH /api/stores/[id]' })
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון חנות'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
