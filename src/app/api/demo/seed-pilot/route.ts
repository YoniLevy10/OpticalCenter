import { NextResponse } from 'next/server'
import { z } from 'zod'
import { findPilotUserByEmail, PILOT_OWNER } from '@/lib/auth/pilot-users'
import { seedPilotUser } from '@/lib/auth/seed-pilot-user'
import { testAuthAllowed } from '@/lib/auth/types'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().email().optional(),
})

/**
 * Seed / refresh a known pilot demo user (Auth + profile + global_admin).
 * Available when test/demo auth flags are on, or when SERVICE_ROLE is present
 * for one-shot ops seeding in non-production.
 */
export async function POST(request: Request) {
  if (!testAuthAllowed() && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let json: unknown = {}
  try {
    json = await request.json()
  } catch {
    json = {}
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const pilot =
    (parsed.data.email ? findPilotUserByEmail(parsed.data.email) : null) ??
    PILOT_OWNER

  if (parsed.data.email && !findPilotUserByEmail(parsed.data.email)) {
    return NextResponse.json(
      { error: 'email is not a configured pilot user' },
      { status: 400 },
    )
  }

  try {
    const result = await seedPilotUser(pilot)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'seed failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/demo/seed-pilot',
    default: PILOT_OWNER,
  })
}
