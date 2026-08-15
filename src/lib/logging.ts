import { createClient } from '@supabase/supabase-js'

/** Lightweight structured logger for pilot observability (no Sentry yet). */
export function logEvent(
  scope: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
) {
  const payload = {
    ts: new Date().toISOString(),
    scope,
    level,
    message,
    ...meta,
  }
  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase anon env')
  return createClient(url, key)
}
