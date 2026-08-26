import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { getSettings, updateSettings } from '@/modules/settings/service'
import { captureError } from '@/lib/monitoring'

const patchSchema = z.object({
  brand_name: z.string().min(1).max(80).optional(),
  country_label: z.string().min(1).max(80).optional(),
  wa_business_phone: z.string().max(32).optional(),
  sla_respond_hours_critical: z.number().int().min(1).max(168).optional(),
  sla_respond_hours_high: z.number().int().min(1).max(168).optional(),
  sla_respond_hours_medium: z.number().int().min(1).max(168).optional(),
  sla_respond_hours_low: z.number().int().min(1).max(168).optional(),
  notify_email: z.string().max(120).optional(),
})

export async function GET(request: Request) {
  try {
    await requireActor(request)
    const { settings, backend } = await getSettings()
    return NextResponse.json({ settings, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/settings' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireActor(request)
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const settings = await updateSettings(parsed.data)
    return NextResponse.json({ settings })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'PATCH /api/settings' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
