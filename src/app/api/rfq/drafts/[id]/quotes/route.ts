import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { addQuoteToDraft } from '@/modules/rfq/service'
import { captureError } from '@/lib/monitoring'

const quoteSchema = z.object({
  source: z.string().min(1).max(200),
  quoted_at: z.string().min(4).max(40),
  currency: z.enum(['ILS', 'EUR', 'USD']).optional(),
  amount: z.number().nonnegative().nullable().optional(),
  vat_included: z.boolean().nullable().optional(),
  valid_until: z.string().max(40).nullable().optional(),
  notes: z.string().max(800).nullable().optional(),
})

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    if (!actorHasHqAccess(actor)) throw new AuthError('אין הרשאת HQ', 403)
    const { id } = await ctx.params
    const parsed = quoteSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const { draft, backend } = await addQuoteToDraft(id, parsed.data)
    return NextResponse.json({ draft, backend }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/rfq/drafts/[id]/quotes' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
