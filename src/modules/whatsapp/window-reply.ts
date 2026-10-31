import { memGetSession, memListSessions } from '@/lib/data/memory-store'
import { phonesMatch } from './classify'
import { sendWhatsAppText } from './send'

const WINDOW_MS = 24 * 60 * 60 * 1000

/** True only when this number wrote to us in the last 24 hours. */
export function sessionWindowOpen(
  updatedAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!updatedAt) return false
  const ms = Date.parse(updatedAt)
  if (!Number.isFinite(ms)) return false
  return now - ms <= WINDOW_MS
}

function liveSession(phone: string) {
  const hit = memListSessions().find((session) => phonesMatch(session.wa_id, phone))
  return hit ? memGetSession(hit.wa_id) : undefined
}

/**
 * Reply inside the open care window. Outside it, keep the text for the
 * manager's next message. Never send a paid template.
 */
export async function notifyManagerInWindow(
  phone: string,
  text: string,
): Promise<'sent' | 'held'> {
  const session = liveSession(phone)
  const body = text.trim()
  if (!body) return 'held'
  if (!session || !sessionWindowOpen(session.updated_at)) {
    if (session) {
      session.draft_payload = { ...(session.draft_payload ?? {}), pending_notice: body }
    }
    return 'held'
  }
  const sent = await sendWhatsAppText({
    toWaId: session.wa_id,
    text: body,
    purpose: 'status_update',
    skipFailureQueue: true,
    forceDryRun: process.env.MAINTAINOS_FORCE_MEMORY === '1',
  }).catch(() => ({ ok: false as const, dryRun: false }))
  if (!sent.ok && !sent.dryRun) {
    session.draft_payload = { ...(session.draft_payload ?? {}), pending_notice: body }
    return 'held'
  }
  return 'sent'
}
