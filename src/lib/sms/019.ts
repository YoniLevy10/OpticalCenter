import 'server-only'

import { logEvent } from '@/lib/logging'

const SMS_019_API = 'https://019sms.co.il/api'
const SMS_019_API_TEST = 'https://019sms.co.il/api/test'

export type Send019SmsResult = {
  ok: boolean
  skipped?: string
  dryRun?: boolean
  status?: number | string | null
  detail?: string
}

/**
 * Normalize to Israeli local form expected by 019SMS: `05xxxxxxx` or `5xxxxxxx`.
 * Accepts `9725…`, `+9725…`, `05…`, `5…`.
 */
export function to019LocalPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  let local = digits
  if (local.startsWith('972')) {
    local = local.slice(3)
  }
  if (local.startsWith('0')) {
    // keep leading 0 — 019 accepts 05xxxxxxx
  } else if (local.startsWith('5') && local.length >= 9) {
    local = `0${local}`
  } else {
    return null
  }

  // Israeli mobiles: 05xxxxxxxx = 10 digits
  if (!/^05\d{8}$/.test(local)) return null
  return local
}

export function is019SmsConfigured(): boolean {
  const username = process.env.SMS_019_USERNAME?.trim()
  const sender = process.env.SMS_019_SENDER?.trim()
  const token =
    process.env.SMS_019_TOKEN?.trim() ||
    process.env.SMS_019_BEARER_TOKEN?.trim()
  const password = process.env.SMS_019_PASSWORD?.trim()
  return Boolean(username && sender && (token || password))
}

/**
 * Send SMS via 019SMS (same provider as Bamakor worker assign alerts).
 *
 * Env:
 * - SMS_019_USERNAME (required)
 * - SMS_019_SENDER (required, max 11 alphanumeric)
 * - SMS_019_TOKEN or SMS_019_BEARER_TOKEN (preferred) — Authorization: Bearer
 * - SMS_019_PASSWORD (legacy) — included in JSON user object when no token
 * - SMS_019_TEST=1 — use /api/test (no real send)
 * - SMS_019_DRY_RUN=1 — log only, no HTTP
 */
export async function send019Sms(input: {
  to: string
  message: string
  /** Correlate logs (ticket id, etc.) */
  meta?: Record<string, unknown>
}): Promise<Send019SmsResult> {
  const username = process.env.SMS_019_USERNAME?.trim()
  const sender = process.env.SMS_019_SENDER?.trim()
  const token =
    process.env.SMS_019_TOKEN?.trim() ||
    process.env.SMS_019_BEARER_TOKEN?.trim()
  const password = process.env.SMS_019_PASSWORD?.trim()

  if (!username || !sender) {
    logEvent('sms:019', 'info', 'skipped_not_configured', {
      ...input.meta,
      hasUsername: Boolean(username),
      hasSender: Boolean(sender),
    })
    return { ok: false, skipped: 'not_configured' }
  }

  if (!token && !password) {
    logEvent('sms:019', 'info', 'skipped_no_auth', input.meta)
    return { ok: false, skipped: 'not_configured' }
  }

  const phone = to019LocalPhone(input.to)
  if (!phone) {
    logEvent('sms:019', 'warn', 'invalid_phone', {
      ...input.meta,
      toPreview: input.to.replace(/\d(?=\d{4})/g, '*').slice(0, 16),
    })
    return { ok: false, skipped: 'invalid_phone' }
  }

  const message = input.message.trim()
  if (!message) {
    return { ok: false, skipped: 'empty_message' }
  }

  if (process.env.SMS_019_DRY_RUN === '1') {
    logEvent('sms:019', 'info', 'dry_run', {
      ...input.meta,
      phone,
      messageLen: message.length,
    })
    return { ok: true, dryRun: true, detail: 'dry_run' }
  }

  const endpoint =
    process.env.SMS_019_TEST === '1' ? SMS_019_API_TEST : SMS_019_API

  const user: Record<string, string> = { username }
  if (!token && password) {
    user.password = password
  }

  const body = {
    sms: {
      user,
      source: sender.slice(0, 11),
      destinations: { phone },
      message,
    },
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let parsed: { status?: number | string; message?: string } | null = null
    try {
      parsed = JSON.parse(text) as { status?: number | string; message?: string }
    } catch {
      parsed = null
    }

    // 019 success: status == 0
    const statusVal = parsed?.status
    const success =
      res.ok &&
      (statusVal === 0 ||
        statusVal === '0' ||
        (statusVal == null && res.ok && endpoint === SMS_019_API_TEST))

    if (!success) {
      logEvent('sms:019', 'error', 'send_failed', {
        ...input.meta,
        httpStatus: res.status,
        providerStatus: statusVal ?? null,
        body: text.slice(0, 200),
      })
      return {
        ok: false,
        status: statusVal ?? res.status,
        detail: text.slice(0, 160),
      }
    }

    logEvent('sms:019', 'info', 'sent', {
      ...input.meta,
      phone,
      providerStatus: statusVal ?? 0,
      test: endpoint === SMS_019_API_TEST,
    })
    return {
      ok: true,
      status: statusVal ?? 0,
      detail: endpoint === SMS_019_API_TEST ? 'test_api' : 'sent',
    }
  } catch (err) {
    logEvent('sms:019', 'error', 'network_error', {
      ...input.meta,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, skipped: 'network_error' }
  }
}
