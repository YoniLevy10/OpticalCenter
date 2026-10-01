import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { captureError } from '@/lib/monitoring'
import {
  listWhatsAppTemplates,
  updateWhatsAppTemplate,
} from '@/modules/whatsapp/templates-admin'

function requireOpsAdmin(actor: Awaited<ReturnType<typeof requireActor>>) {
  const ok = actor.memberships.some(
    (m) => m.role === 'global_admin' || m.role === 'global_maintenance',
  )
  if (!ok) throw new AuthError('אין הרשאה לניהול תבניות WhatsApp', 403)
}

const patchSchema = z.object({
  id: z.string().min(1),
  meta_name: z.string().max(128).nullable().optional(),
  body: z.string().min(1).max(1024).optional(),
  category: z.string().max(40).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    requireOpsAdmin(actor)
    const { templates, backend } = await listWhatsAppTemplates()
    return NextResponse.json({ templates, backend })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/settings/whatsapp-templates' })
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
    const template = await updateWhatsAppTemplate(parsed.data)
    return NextResponse.json({ template })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'PATCH /api/settings/whatsapp-templates' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
