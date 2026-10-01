/**
 * Web Push send (VAPID) for MaintainOS technicians.
 * Adapted from Bino lib/push-notifications.ts — profile-scoped subscriptions.
 */

import webpush from 'web-push'
import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import {
  memDeletePushSubscription,
  memListPushSubscriptions,
  supabaseReady,
} from '@/lib/data/memory-store'
import { logEvent } from '@/lib/logging'

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
        process.env.VAPID_PUBLIC_KEY?.trim()),
  )
}

function initWebPush(): boolean {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) return false
  const subject =
    process.env.VAPID_SUBJECT?.trim() || 'mailto:ops@maintainos.app'
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

async function sendToRows(
  rows: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: string,
): Promise<{ sent: number; expired: number }> {
  let sent = 0
  let expired = 0
  await Promise.allSettled(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
          { TTL: 86400 },
        )
        sent += 1
      } catch (e) {
        const status =
          e && typeof e === 'object' && 'statusCode' in e
            ? (e as { statusCode?: number }).statusCode
            : undefined
        if (status === 404 || status === 410) {
          expired += 1
          if (await supabaseReady()) {
            const supabase = createSystemClient('push_expire')
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', row.endpoint)
          } else {
            memDeletePushSubscription(row.endpoint)
          }
        }
      }
    }),
  )
  return { sent, expired }
}

/** Notify a technician profile about a newly assigned ticket. */
export async function notifyTechnicianAssignedPush(input: {
  profileId: string
  ticketId: string
  displayNumber: string
  storeName: string
}): Promise<{ sent: number; skipped?: string }> {
  if (!initWebPush()) {
    return { sent: 0, skipped: 'vapid_not_configured' }
  }

  const title = `שיוך חדש · ${input.displayNumber}`
  const body = `${input.storeName} — פתחו בפורטל הטכנאי`
  const url = `/tech/${input.ticketId}`
  const payload = JSON.stringify({
    title,
    body,
    url,
    tag: `tech-assign-${input.ticketId}`,
  })

  let rows: { id: string; endpoint: string; p256dh: string; auth: string }[] =
    []

  if (await supabaseReady()) {
    const supabase = createSystemClient('push_tech_notify')
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('profile_id', input.profileId)
    if (error) {
      if (!isSupabaseSchemaError(error)) {
        logEvent('push:send', 'error', 'list_failed', { error: error.message })
      }
      rows = memListPushSubscriptions(input.profileId).map((s) => ({
        id: s.id,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
      }))
    } else {
      rows = data ?? []
    }
  } else {
    rows = memListPushSubscriptions(input.profileId).map((s) => ({
      id: s.id,
      endpoint: s.endpoint,
      p256dh: s.p256dh,
      auth: s.auth,
    }))
  }

  if (rows.length === 0) {
    return { sent: 0, skipped: 'no_subscriptions' }
  }

  const result = await sendToRows(rows, payload)
  logEvent('push:send', 'info', 'tech_assigned', {
    profileId: input.profileId,
    ticketId: input.ticketId,
    ...result,
  })
  return { sent: result.sent }
}
