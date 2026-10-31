import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  getActorFromRequest,
} from '@/lib/auth/request-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { AuthError, actorHasHqAccess } from '@/lib/auth/types'
import { replyToAri } from '@/modules/ops/agent-chat'
import { captureError } from '@/lib/monitoring'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().max(800),
      }),
    )
    .max(8)
    .optional(),
})

export async function POST(request: Request) {
  try {
    const locale = await getLocale()
    const actor = await getActorFromRequest(request)
    if (!actor && !shouldAllowDemoEntry()) {
      throw new AuthError('נדרשת התחברות', 401)
    }
    if (actor && !actorHasHqAccess(actor)) {
      throw new AuthError('הסוכן פתוח רק לארי', 403)
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: phrase(locale, 'בקשה לא תקינה') }, { status: 400 })
    }

    const answered = await replyToAri({
      message: parsed.data.message,
      history: parsed.data.history,
      actor,
      locale,
    })
    return NextResponse.json(answered)
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { scope: 'ops:agent-chat' })
    const locale = await getLocale().catch(() => 'he' as const)
    return NextResponse.json(
      { error: phrase(locale, 'הסוכן לא הצליח לענות') },
      { status: 500 },
    )
  }
}
