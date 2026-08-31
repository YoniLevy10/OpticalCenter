import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/logging'
import {
  memGet,
  memListTickets,
  supabaseReady,
} from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { appendEvent } from '@/modules/tickets/service'
import {
  selectUnassignedTimeouts,
  unassignedTimeoutMsFromEnv,
  type UnassignedCandidate,
} from '@/modules/tickets/unassigned-timeout'
import { notifyUnassignedTimeout } from '@/lib/email/ops-notify'

export const runtime = 'nodejs'

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

async function loadUnassignedCandidates(): Promise<UnassignedCandidate[]> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('unassigned_timeout_cron')
    const { data, error } = await supabase
      .from('tickets')
      .select('id, status, assigned_to, created_at, display_number, priority')
      .is('assigned_to', null)
      .not('status', 'in', '("resolved","closed","cancelled")')
      .limit(500)
    if (!error && data) return data as UnassignedCandidate[]
  }
  return memListTickets()
    .filter((t) => !t.assigned_to)
    .map((t) => ({
      id: t.id,
      status: t.status,
      assigned_to: t.assigned_to,
      created_at: t.created_at,
      display_number: t.display_number,
      priority: t.priority,
    }))
}

async function alreadyNotifiedRecently(ticketId: string): Promise<boolean> {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  if (await supabaseReady()) {
    const supabase = createSystemClient('unassigned_timeout_cron')
    const { data } = await supabase
      .from('ticket_events')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('event_type', 'unassigned_timeout_notified')
      .gte('created_at', since)
      .limit(1)
    return Boolean(data?.length)
  }
  const ticket = memGet(ticketId)
  if (!ticket) return false
  const sinceMs = Date.now() - 6 * 60 * 60 * 1000
  return ticket.events.some(
    (e) =>
      e.event_type === 'unassigned_timeout_notified' &&
      new Date(e.created_at).getTime() >= sinceMs,
  )
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const thresholdMs = unassignedTimeoutMsFromEnv()
    const candidates = await loadUnassignedCandidates()
    const timedOut = selectUnassignedTimeouts(candidates, thresholdMs)
    let notified = 0

    for (const t of timedOut) {
      if (await alreadyNotifiedRecently(t.id)) continue
      const ageHours =
        (Date.now() - new Date(t.created_at).getTime()) / 3_600_000
      await appendEvent(t.id, 'unassigned_timeout_notified', null, {
        age_hours: Math.round(ageHours * 10) / 10,
        threshold_ms: thresholdMs,
      })
      void notifyUnassignedTimeout({
        ticketId: t.id,
        displayNumber: t.display_number,
        ageHours,
      })
      notified += 1
    }

    return NextResponse.json({
      ok: true,
      scanned: candidates.length,
      timedOut: timedOut.length,
      notified,
      thresholdHours: thresholdMs / 3_600_000,
    })
  } catch (e) {
    logEvent('cron:unassigned', 'error', 'run_failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'cron_failed' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
