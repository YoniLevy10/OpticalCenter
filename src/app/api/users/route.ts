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
    'store_employee',
    'internal_technician',
  ]),
  country_id: z.string().uuid().nullable().optional(),
  region_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  organization_id: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  password: z.string().min(6).max(72).optional(),
  phone: z.string().max(32).nullable().optional(),
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
      const fieldErrors = parsed.error.flatten().fieldErrors
      const first = Object.values(fieldErrors).flat()[0]
      return NextResponse.json(
        {
          error: first
            ? `בקשה לא תקינה: ${first}`
            : 'בקשה לא תקינה — בדקו שם, מייל, סיסמה ותפקיד',
          details: parsed.error.flatten(),
        },
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
