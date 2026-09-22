import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/logging'
import {
  memGet,
  memListTickets,
  supabaseReady,
} from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { appendEvent, getById } from '@/modules/tickets/service'
import { notifyReporter } from '@/modules/notifications/lifecycle-notify'
import { captureError } from '@/lib/monitoring'

export const runtime = 'nodejs'

/**
 * Nudge store when ticket sits in `resolved` without store confirmation.
 * Keeps the lifecycle moving without Ari chasing the branch.
 */
function cronAuthorized(request: Request): boolean {
  if (process.env.MAINTAINOS_FORCE_MEMORY === '1') return true
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  if (request.headers.get('x-cron-secret') === secret) return true
  if (request.headers.get('cron-secret') === secret) return true
  return false
}

function nudgeHours(): number {
  const raw = Number(process.env.STORE_CONFIRM_NUDGE_HOURS ?? '4')
  return Number.isFinite(raw) && raw > 0 ? raw : 4
}

type Candidate = {
  id: string
  status: string
  resolved_at: string | null
  updated_at: string
  reporter_phone: string | null
}

async function loadResolvedAwaitingConfirm(): Promise<Candidate[]> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('lifecycle_nudge_cron')
    const { data, error } = await supabase
      .from('tickets')
      .select('id, status, resolved_at, updated_at, reporter_phone, store_confirmed_at')
      .eq('status', 'resolved')
      .is('store_confirmed_at', null)
      .limit(200)
    if (!error && data) {
      return data.map((r) => ({
        id: String(r.id),
        status: String(r.status),
        resolved_at: (r.resolved_at as string | null) ?? null,
        updated_at: String(r.updated_at),
        reporter_phone: (r.reporter_phone as string | null) ?? null,
      }))
    }
  }
  return memListTickets()
    .filter((t) => t.status === 'resolved' && !t.store_confirmed_at)
    .map((t) => ({
      id: t.id,
      status: t.status,
      resolved_at: t.resolved_at,
      updated_at: t.updated_at,
      reporter_phone: t.reporter_phone,
    }))
}

async function alreadyNudgedRecently(ticketId: string): Promise<boolean> {
  const sinceMs = Date.now() - 6 * 60 * 60 * 1000
  if (await supabaseReady()) {
    const supabase = createSystemClient('lifecycle_nudge_cron')
    const { data } = await supabase
      .from('ticket_events')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('event_type', 'lifecycle_nudge')
      .gte('created_at', new Date(sinceMs).toISOString())
      .limit(1)
    return Boolean(data?.length)
  }
  const ticket = memGet(ticketId)
  if (!ticket) return false
  return ticket.events.some(
    (e) =>
      e.event_type === 'lifecycle_nudge' &&
      new Date(e.created_at).getTime() >= sinceMs,
  )
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hours = nudgeHours()
  const cutoff = Date.now() - hours * 3_600_000
  let nudged = 0
  let skipped = 0

  try {
    const candidates = await loadResolvedAwaitingConfirm()
    for (const c of candidates) {
      const resolvedMs = new Date(c.resolved_at ?? c.updated_at).getTime()
      if (!Number.isFinite(resolvedMs) || resolvedMs > cutoff) {
        skipped += 1
        continue
      }
      if (await alreadyNudgedRecently(c.id)) {
        skipped += 1
        continue
      }
      const detail = await getById(c.id)
      if (!detail) {
        skipped += 1
        continue
      }
      await notifyReporter(detail, 'resolved')
      await appendEvent(c.id, 'lifecycle_nudge', null, {
        kind: 'store_confirm',
        hours,
      })
      nudged += 1
    }

    logEvent('cron:lifecycle_nudge', 'info', 'done', {
      nudged,
      skipped,
      hours,
    })
    return NextResponse.json({ ok: true, nudged, skipped, hours })
  } catch (err) {
    captureError(err, { route: 'GET /api/cron/lifecycle-nudge' })
    logEvent('cron:lifecycle_nudge', 'error', 'failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
