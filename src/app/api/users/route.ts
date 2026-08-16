import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import {
  createUser,
  listUsers,
  requireUsersAdmin,
} from '@/modules/users/service'

const createSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  role: z.enum([
    'global_admin',
    'global_maintenance',
    'country_manager',
    'regional_manager',
    'store_manager',
    'store_employee',
    'internal_technician',
    'external_provider',
  ]),
  country_id: z.string().uuid().nullable().optional(),
  region_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  organization_id: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    requireUsersAdmin(actor)
    const users = await listUsers()
    return NextResponse.json({ users })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'שגיאה בטעינת משתמשים'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    requireUsersAdmin(actor)
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'בקשה לא תקינה', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const user = await createUser(parsed.data)
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת משתמש'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
