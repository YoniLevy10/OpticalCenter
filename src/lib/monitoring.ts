/**
 * Error monitoring — prefers @sentry/nextjs when DSN is set; falls back to
 * a minimal envelope POST so builds without the wizard still work.
 */

import * as Sentry from '@sentry/nextjs'

export function captureError(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error('[maintainos]', message, context ?? {}, stack ?? '')

  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  if (!dsn) return

  try {
    Sentry.captureException(err instanceof Error ? err : new Error(message), {
      extra: context,
    })
    return
  } catch {
    void sendToSentry(dsn, message, stack, context).catch((sendErr) => {
      console.error('[maintainos] sentry send failed', sendErr)
    })
  }
}

async function sendToSentry(
  dsn: string,
  message: string,
  stack: string | undefined,
  context?: Record<string, unknown>,
) {
  let parsed: URL
  try {
    parsed = new URL(dsn)
  } catch {
    return
  }
  const publicKey = parsed.username
  const projectId = parsed.pathname.replace(/^\//, '')
  if (!publicKey || !projectId) return

  const url = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/`
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    message,
    exception: stack
      ? {
          values: [
            {
              type: 'Error',
              value: message,
              stacktrace: { frames: [{ filename: 'app', function: stack }] },
            },
          ],
        }
      : undefined,
    extra: context,
  }

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=maintainos/1.0`,
    },
    body: JSON.stringify(event),
  })
}
