import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { patchUser, requireUsersAdmin } from '@/modules/users/service'

const patchSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(200).optional(),
  membership_id: z.string().uuid().optional(),
  role: z
    .enum([
      'global_admin',
      'global_maintenance',
      'store_employee',
      'internal_technician',
    ])
    .optional(),
  country_id: z.string().uuid().nullable().optional(),
  region_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request)
    requireUsersAdmin(actor)
    const { id } = await context.params
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'מזהה לא תקין' }, { status: 400 })
    }
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const user = await patchUser(id, parsed.data)
    return NextResponse.json({ user })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'שגיאה בעדכון משתמש'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
