import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { captureError } from '@/lib/monitoring'
import {
  getCountryWhatsAppCredentials,
  updateCountryWhatsAppCredentials,
} from '@/modules/whatsapp/templates-admin'

function requireOpsAdmin(actor: Awaited<ReturnType<typeof requireActor>>) {
  const ok = actor.memberships.some(
    (m) => m.role === 'global_admin' || m.role === 'global_maintenance',
  )
  if (!ok) throw new AuthError('אין הרשאה להגדרות WhatsApp', 403)
}

const patchSchema = z.object({
  whatsapp_phone_number_id: z.string().max(64).nullable().optional(),
  whatsapp_display_phone: z.string().max(32).nullable().optional(),
  whatsapp_access_token: z.string().max(512).nullable().optional(),
})

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    requireOpsAdmin(actor)
    const { credentials, backend } = await getCountryWhatsAppCredentials()
    return NextResponse.json({ credentials, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/settings/country-whatsapp' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireActor(request)
    requireOpsAdmin(actor)
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const credentials = await updateCountryWhatsAppCredentials(parsed.data)
    return NextResponse.json({ credentials })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'PATCH /api/settings/country-whatsapp' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
