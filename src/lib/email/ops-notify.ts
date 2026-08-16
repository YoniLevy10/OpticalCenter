import { logEvent } from '@/lib/logging'
import { memGetSettings } from '@/lib/data/memory-store'

/**
 * Ops notification email via Resend (same transport as login magic link).
 * No-ops cleanly when RESEND_API_KEY or notify_email is unset.
 */
export async function sendOpsNotifyEmail(input: {
  subject: string
  html: string
  to?: string
}): Promise<{ ok: boolean; detail: string }> {
  const settings = memGetSettings()
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
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        html: input.html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      logEvent('email:ops', 'error', 'resend_failed', {
        status: res.status,
        body: body.slice(0, 160),
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
