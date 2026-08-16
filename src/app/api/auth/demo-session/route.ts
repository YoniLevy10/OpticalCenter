import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEMO_ACTORS } from '@/lib/auth/memory-memberships'
import { TEST_ACTOR_COOKIE } from '@/lib/auth/demo-session'
import { testAuthAllowed } from '@/lib/auth/types'
import { isUuid } from '@/modules/tickets/tech'

const bodySchema = z.object({
  profileId: z.string().uuid().optional(),
  role: z.enum(['hq', 'techA', 'techB']).optional(),
})

/**
 * Dev/E2E only: set mos_test_actor cookie.
 * Disabled in true production (testAuthAllowed === false).
 */
export async function POST(request: Request) {
  if (!testAuthAllowed()) {
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

  let profileId = parsed.data.profileId
  if (!profileId) {
    if (parsed.data.role === 'techB') profileId = DEMO_ACTORS.techB
    else if (parsed.data.role === 'techA') profileId = DEMO_ACTORS.techA
    else profileId = DEMO_ACTORS.globalAdmin
  }
  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'invalid profile' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true, profileId })
  res.cookies.set(TEST_ACTOR_COOKIE, profileId, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
  })
  return res
}
