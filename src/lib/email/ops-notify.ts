import { logEvent } from '@/lib/logging'
import { getSettings } from '@/modules/settings/service'

export type OpsEmailAttachment = {
  filename: string
  content: string // base64
  contentType?: string
}

/**
 * Ops notification email via Resend (same transport as login magic link).
 * No-ops cleanly when RESEND_API_KEY or notify_email is unset.
 */
export async function sendOpsNotifyEmail(input: {
  subject: string
  html: string
  to?: string
  attachments?: OpsEmailAttachment[]
}): Promise<{ ok: boolean; detail: string }> {
  const { settings } = await getSettings()
  const to = (input.to ?? settings.notify_email)?.trim()
  if (!to) {
    logEvent('email:ops', 'info', 'skipped_no_notify_email')
    return { ok: false, detail: 'no_notify_email' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    logEvent('email:ops', 'info', 'skipped_no_resend_key', { to })
    return { ok: false, detail: 'no_resend_key' }
  }

  const from =
    process.env.LOGIN_EMAIL_FROM?.trim() || 'MaintainOS <onboarding@resend.dev>'

  try {
    const body: Record<string, unknown> = {
      from,
      to: [to],
      subject: input.subject,
      html: input.html,
    }
    if (input.attachments?.length) {
      body.attachments = input.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentType ? { content_type: a.contentType } : {}),
      }))
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      logEvent('email:ops', 'error', 'resend_failed', {
        status: res.status,
        body: text.slice(0, 160),
      })
      return { ok: false, detail: `resend_${res.status}` }
    }
    logEvent('email:ops', 'info', 'sent', { to })
    return { ok: true, detail: 'resend' }
  } catch (err) {
    logEvent('email:ops', 'error', 'send_threw', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, detail: 'network_error' }
  }
}

export async function notifySlaBreach(input: {
  ticketId: string
  displayNumber?: string | null
  breachKind: 'respond' | 'resolve'
  priority: string
}): Promise<void> {
  const label = input.displayNumber ?? input.ticketId.slice(0, 8)
  await sendOpsNotifyEmail({
    subject: `MaintainOS · הפרת SLA · ${label}`,
    html: `
      <div dir="rtl" style="font-family:sans-serif;line-height:1.5">
        <h2>הפרת SLA</h2>
        <p>תקלה <strong>${label}</strong> חרגה מ־SLA (${input.breachKind}).</p>
        <p>עדיפות נוכחית: <strong>${input.priority}</strong></p>
        <p>מזהה: <code dir="ltr">${input.ticketId}</code></p>
      </div>
    `,
  })
}

export async function notifyUnassignedTimeout(input: {
  ticketId: string
  displayNumber?: string | null
  ageHours: number
}): Promise<void> {
  const label = input.displayNumber ?? input.ticketId.slice(0, 8)
  await sendOpsNotifyEmail({
    subject: `MaintainOS · ללא שיוך · ${label}`,
    html: `
      <div dir="rtl" style="font-family:sans-serif;line-height:1.5">
        <h2>תקלה ללא שיוך</h2>
        <p>תקלה <strong>${label}</strong> ממתינה לשיוך כבר כ־${input.ageHours.toFixed(1)} שעות.</p>
        <p>מזהה: <code dir="ltr">${input.ticketId}</code></p>
      </div>
    `,
  })
}

export async function notifyMonthlyReport(input: {
  monthLabel: string
  periodStart: string
  periodEnd: string
  open: number
  resolved: number
  breached: number
  pctWithinSla: number | null
  historyUrl: string
  pdfBase64?: string
}): Promise<{ ok: boolean; detail: string }> {
  const attachments = input.pdfBase64
    ? [
        {
          filename: `maintainos-monthly-${input.periodStart}.pdf`,
          content: input.pdfBase64,
          contentType: 'application/pdf',
        },
      ]
    : undefined

  return sendOpsNotifyEmail({
    subject: `MaintainOS · דוח חודשי · ${input.monthLabel}`,
    html: `
      <div dir="rtl" style="font-family:sans-serif;line-height:1.5">
        <h2>דוח חודשי — ${input.monthLabel}</h2>
        <p>תקופה: ${input.periodStart} — ${input.periodEnd}</p>
        <ul>
          <li>פתוחות: <strong>${input.open}</strong></li>
          <li>נפתרו: <strong>${input.resolved}</strong></li>
          <li>חריגות SLA: <strong>${input.breached}</strong></li>
          <li>% בתוך SLA: <strong>${input.pctWithinSla ?? '—'}</strong></li>
        </ul>
        <p><a href="${input.historyUrl}">היסטוריית דוחות</a></p>
      </div>
    `,
    attachments,
  })
}
