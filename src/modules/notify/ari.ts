import 'server-only'

import { deskPhones } from '@/lib/data/ops-ledger'
import { send019Sms } from '@/lib/sms/019'
import { logEvent } from '@/lib/logging'
import { sendWhatsAppText } from '@/modules/whatsapp/send'

export async function notifyPhone(
  to: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  const text = message.trim()
  if (!text || !to.trim()) return
  const [sms, whatsapp] = await Promise.all([
    send019Sms({ to, message: text, meta }).catch((err: unknown) => {
      logEvent('notify:phone', 'warn', 'sms_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return { ok: false as const }
    }),
    sendWhatsAppText({
      toWaId: to,
      text,
      purpose: 'status_update',
      skipFailureQueue: true,
    }).catch((err: unknown) => {
      logEvent('notify:phone', 'warn', 'whatsapp_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return { ok: false as const, dryRun: false, waMessageId: null }
    }),
  ])
  logEvent('notify:phone', 'info', 'sent', {
    ...meta,
    sms: sms.ok,
    whatsapp: whatsapp.ok,
  })
}

/** Tell every desk manager. A failed channel does not block the action. */
export async function notifyAri(message: string, meta?: Record<string, unknown>) {
  await Promise.all(deskPhones().map((phone) => notifyPhone(phone, message, meta)))
}
