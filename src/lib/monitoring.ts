/**
 * Lightweight error monitoring.
 *
 * Always logs to the console. When `SENTRY_DSN` is set, posts a minimal
 * Sentry-compatible event envelope via fetch (no @sentry/nextjs dependency —
 * keeps Next 15 builds working without the wizard).
 */

export function captureError(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error('[maintainos]', message, context ?? {}, stack ?? '')

  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn) return

  void sendToSentry(dsn, message, stack, context).catch((sendErr) => {
    console.error('[maintainos] sentry send failed', sendErr)
  })
}

async function sendToSentry(
  dsn: string,
  message: string,
  stack: string | undefined,
  context?: Record<string, unknown>,
) {
  // DSN: https://<key>@<host>/<projectId>
  let parsed: URL
  try {
    parsed = new URL(dsn)
  } catch {
    return
  }
  const publicKey = parsed.username
  const projectId = parsed.pathname.replace(/^\//, '')
  if (!publicKey || !projectId) return

  const ingest = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/?sentry_key=${encodeURIComponent(publicKey)}&sentry_version=7`
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    message,
    exception: stack
      ? {
          values: [
            {
              type: errType(message),
              value: message,
              stacktrace: { frames: [{ filename: 'app', function: stack.slice(0, 500) }] },
            },
          ],
        }
      : undefined,
    tags: { app: 'maintainos' },
    extra: context ?? {},
  }

  await fetch(ingest, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=maintainos-thin/1.0, sentry_key=${publicKey}`,
    },
    body: JSON.stringify(event),
  })
}

function errType(message: string) {
  return message.split(':')[0]?.slice(0, 64) || 'Error'
}
