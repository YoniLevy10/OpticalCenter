import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireActor,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import {
  deletePushSubscription,
  listPushSubscriptions,
  upsertPushSubscription,
} from '@/modules/push/service'
import { captureError } from '@/lib/monitoring'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request)
    const { subscriptions, backend } = await listPushSubscriptions(actor.id)
    return NextResponse.json({
      subscriptions,
      backend,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null,
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'GET /api/push/subscribe' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request)
    const parsed = subscribeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 })
    }
    const row = await upsertPushSubscription({
      profile_id: actor.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    })
    return NextResponse.json({
      ok: true,
      subscriptionId: row.id,
      note: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ? undefined
        : 'subscription_stored_vapid_optional',
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/push/subscribe' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'שגיאה' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    await requireActor(request)
    const body = await request.json().catch(() => ({}))
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : ''
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint חובה' }, { status: 400 })
    }
    await deletePushSubscription(endpoint)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    return NextResponse.json({ error: 'שגיאה' }, { status: 400 })
  }
}
