import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import {
  memListSessions,
  memSetSessionTakeover,
  memUpsertSession,
  MEM_COUNTRY_ID,
} from '@/lib/data/memory-store'
import { captureError } from '@/lib/monitoring'

export async function GET(request: Request) {
  try {
    await requireActor(request)
    // Seed a demo conversation when empty so the inbox isn't blank in pilot
    let sessions = memListSessions()
    if (sessions.length === 0) {
      memUpsertSession({
        wa_id: '972501112233',
        country_id: MEM_COUNTRY_ID,
        store_id: 'demo-172',
        store_code: '172',
        state: 'awaiting_description',
        pending_description: null,
        human_takeover: false,
        last_inbound: 'המזגן לא מקרר באולם',
      })
      sessions = memListSessions()
    }
    return NextResponse.json({ sessions })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/inbox/sessions' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

const patchSchema = z.object({
  wa_id: z.string().min(5),
  human_takeover: z.boolean(),
})

export async function PATCH(request: Request) {
  try {
    await requireActor(request)
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const session = memSetSessionTakeover(
      parsed.data.wa_id,
      parsed.data.human_takeover,
    )
    return NextResponse.json({ session })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'PATCH /api/inbox/sessions' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}
