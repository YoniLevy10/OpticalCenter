import 'server-only'

import { deskNotifyPhones } from '@/lib/data/ops-ledger'
import { logEvent } from '@/lib/logging'
import {
  isWhatsAppOutsideWindowError,
  sendWhatsAppTemplate,
  sendWhatsAppText,
  type SendWhatsAppResult,
} from '@/modules/whatsapp/send'
import {
  defaultDeskAlertTemplateName,
  deskAlertParameter,
  META_WA_TEMPLATES,
} from '@/modules/whatsapp/templates'

function failedSend(err: unknown): SendWhatsAppResult {
  logEvent('notify:phone', 'warn', 'whatsapp_failed', {
    error: err instanceof Error ? err.message : String(err),
  })
  return { ok: false, dryRun: false, waMessageId: null }
}

export async function notifyPhone(
  to: string,
  message: string,
  meta?: Record<string, unknown>,
  forceDryRun = false,
) {
  const text = message.trim()
  if (!text || !to.trim()) return
  const dry = forceDryRun || process.env.MAINTAINOS_FORCE_MEMORY === '1'
  // SMS disabled for pilot cost — WhatsApp / ops web only.
  let whatsapp = await sendWhatsAppText({
    toWaId: to,
    text,
    purpose: 'status_update',
    skipFailureQueue: true,
    forceDryRun: dry,
  }).catch(failedSend)

  const outsideWindow =
    !whatsapp.ok &&
    !whatsapp.skippedByPolicy &&
    isWhatsAppOutsideWindowError(
      whatsapp.error,
      whatsapp.errorCode,
      whatsapp.errorSubcode,
    )

  if (outsideWindow) {
    const template = await sendWhatsAppTemplate({
      toWaId: to,
      templateName: defaultDeskAlertTemplateName(),
      languageCode:
        process.env.WHATSAPP_DESK_TEMPLATE_LANG?.trim() ||
        META_WA_TEMPLATES.deskAlert.language,
      bodyParameters: [deskAlertParameter(text)],
      purpose: 'status_update',
      skipFailureQueue: true,
      forceDryRun: dry,
    }).catch(failedSend)
    logEvent('notify:phone', template.ok ? 'info' : 'warn', 'desk_template', {
      ...meta,
      ok: template.ok,
      dryRun: template.dryRun,
      error: template.error ?? null,
    })
    if (template.ok) whatsapp = template
  }

  logEvent('notify:phone', 'info', 'sent', {
    ...meta,
    sms: false,
    whatsapp: whatsapp.ok,
    outsideWindow,
  })
}

/** Tell desk notify phones. Decisions stay in /ops/approvals. */
export async function notifyAri(message: string, meta?: Record<string, unknown>) {
  const forceDryRun = meta?.dryRun === true
  await Promise.all(
    deskNotifyPhones().map((phone) => notifyPhone(phone, message, meta, forceDryRun)),
  )
}
