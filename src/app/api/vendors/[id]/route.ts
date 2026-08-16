import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { updateVendor } from '@/modules/vendors/service'
import { captureError } from '@/lib/monitoring'

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  contact_phone: z.string().max(32).nullable().optional(),
  contact_email: z.string().max(120).nullable().optional(),
  specialties: z.string().max(64).optional(),
  active: z.boolean().optional(),
  webhook_url: z.string().url().nullable().optional().or(z.literal('')),
})

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const { id } = await ctx.params
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const vendor = await updateVendor(id, {
      ...parsed.data,
      webhook_url:
        parsed.data.webhook_url === '' ? null : parsed.data.webhook_url,
    })
    return NextResponse.json({ vendor })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'PATCH /api/vendors/[id]' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
