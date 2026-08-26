import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import {
  listInboxSessions,
  setSessionTakeover,
} from '@/modules/inbox/service'
import { captureError } from '@/lib/monitoring'

export async function GET(request: Request) {
  try {
    await requireActor(request)
    const { sessions, backend } = await listInboxSessions()
    return NextResponse.json({ sessions, backend })
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
    const session = await setSessionTakeover(
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
