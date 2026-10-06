import 'server-only'

import { deskNotifyPhones } from '@/lib/data/ops-ledger'
import { logEvent } from '@/lib/logging'
import { sendWhatsAppText } from '@/modules/whatsapp/send'

export async function notifyPhone(
  to: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  const text = message.trim()
  if (!text || !to.trim()) return
  // SMS disabled for pilot cost — WhatsApp / ops web only.
  const whatsapp = await sendWhatsAppText({
    toWaId: to,
    text,
    purpose: 'status_update',
    skipFailureQueue: true,
  }).catch((err: unknown) => {
    logEvent('notify:phone', 'warn', 'whatsapp_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false as const, dryRun: false, waMessageId: null }
  })
  logEvent('notify:phone', 'info', 'sent', {
    ...meta,
    sms: false,
    whatsapp: whatsapp.ok,
  })
}

/** Tell desk notify phones (not Ari’s personal number during pilot). */
export async function notifyAri(message: string, meta?: Record<string, unknown>) {
  await Promise.all(deskNotifyPhones().map((phone) => notifyPhone(phone, message, meta)))
}
