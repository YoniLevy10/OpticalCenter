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
  selectTicketsForSlaEscalation,
  type EscalationCandidate,
} from '@/modules/tickets/sla-escalation'
import type { TicketPriority } from '@/modules/tickets/constants'
import { notifySlaBreach } from '@/lib/email/ops-notify'

export const runtime = 'nodejs'

function cronAuthorized(request: Request): boolean {
  if (process.env.MAINTAINOS_FORCE_MEMORY === '1') return true
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    // Misconfigured production cron — refuse rather than open the endpoint.
    return false
  }
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  if (request.headers.get('x-cron-secret') === secret) return true
  if (request.headers.get('cron-secret') === secret) return true
  return false
}

async function loadOpenTickets(): Promise<EscalationCandidate[]> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('sla_escalation_cron')
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, status, priority, sla_respond_by, sla_resolve_by, first_response_at, resolved_at',
      )
      .not('status', 'in', '("resolved","closed","cancelled")')
      .limit(500)
    if (!error && data) return data as EscalationCandidate[]
  }
  return memListTickets().map((t) => ({
    id: t.id,
    status: t.status,
    priority: t.priority,
    sla_respond_by: t.sla_respond_by,
    sla_resolve_by: t.sla_resolve_by,
    first_response_at: t.first_response_at,
    resolved_at: t.resolved_at,
  }))
}

async function applyEscalation(action: {
  ticketId: string
  breachKind: 'respond' | 'resolve'
  fromPriority: string
  toPriority: TicketPriority
}): Promise<boolean> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('sla_escalation_cron')
    if (action.fromPriority !== action.toPriority) {
      const { error } = await supabase
        .from('tickets')
        .update({ priority: action.toPriority })
        .eq('id', action.ticketId)
      if (error) {
        logEvent('cron:sla', 'error', 'priority_update_failed', {
          ticketId: action.ticketId,
          error: error.message,
        })
        return false
      }
    }
  } else {
    const ticket = memGet(action.ticketId)
    if (!ticket) return false
    if (action.fromPriority !== action.toPriority) {
      ticket.priority = action.toPriority
      ticket.updated_at = new Date().toISOString()
    }
  }

  await appendEvent(action.ticketId, 'sla_breached', null, {
    kind: action.breachKind,
    from_priority: action.fromPriority,
    to_priority: action.toPriority,
  })

  // Email HQ when notify_email / Resend configured.
  const ticket = memGet(action.ticketId)
  void notifySlaBreach({
    ticketId: action.ticketId,
    displayNumber: ticket?.display_number,
    breachKind: action.breachKind,
    priority: action.toPriority,
  })

  // Optional manager notify — log when no manager phone configured.
  const managerPhone =
    process.env.SLA_MANAGER_PHONE || process.env.WA_MANAGER_PHONE || null
  if (!managerPhone) {
    logEvent('cron:sla', 'info', 'no_manager_phone', {
      ticketId: action.ticketId,
      breachKind: action.breachKind,
    })
  } else {
    logEvent('cron:sla', 'info', 'manager_notify_skipped_pilot', {
      ticketId: action.ticketId,
      managerPhone: managerPhone.replace(/\d(?=\d{4})/g, '*'),
    })
  }

  return true
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tickets = await loadOpenTickets()
    const actions = selectTicketsForSlaEscalation(tickets)
    let escalated = 0
    for (const action of actions) {
      // Avoid duplicate sla_breached spam: skip if already breached at this priority.
      const existing = await alreadyBreachedRecently(action.ticketId)
      if (existing && action.fromPriority === action.toPriority) continue
      const ok = await applyEscalation(action)
      if (ok) escalated += 1
    }

    return NextResponse.json({
      ok: true,
      scanned: tickets.length,
      candidates: actions.length,
      escalated,
    })
  } catch (e) {
    logEvent('cron:sla', 'error', 'run_failed', {
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

async function alreadyBreachedRecently(ticketId: string): Promise<boolean> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('sla_escalation_cron')
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ticket_events')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('event_type', 'sla_breached')
      .gte('created_at', since)
      .limit(1)
    return Boolean(data?.length)
  }
  const ticket = memGet(ticketId)
  if (!ticket) return false
  const since = Date.now() - 60 * 60 * 1000
  return ticket.events.some(
    (e) =>
      e.event_type === 'sla_breached' &&
      new Date(e.created_at).getTime() >= since,
  )
}
