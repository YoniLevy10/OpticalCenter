import type { TicketPriority } from '@/modules/tickets/constants'
import { getSlaBreachKind } from '@/modules/tickets/sla'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'

export type EscalationCandidate = {
  id: string
  status: string
  priority: string
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
}

export type EscalationAction = {
  ticketId: string
  breachKind: 'respond' | 'resolve'
  fromPriority: string
  toPriority: TicketPriority
}

const PRIORITY_ORDER: TicketPriority[] = ['low', 'medium', 'high', 'critical']

/** Bump one step toward critical (idempotent at critical). */
export function bumpPriorityTowardCritical(
  priority: string,
): TicketPriority {
  const idx = PRIORITY_ORDER.indexOf(priority as TicketPriority)
  if (idx < 0) return 'high'
  if (idx >= PRIORITY_ORDER.length - 1) return 'critical'
  return PRIORITY_ORDER[idx + 1]!
}

/**
 * Pure selector: open tickets past respond/resolve SLA that should escalate.
 * Does not mutate — caller applies priority bump + sla_breached event.
 */
export function selectTicketsForSlaEscalation(
  tickets: EscalationCandidate[],
  now = new Date(),
): EscalationAction[] {
  const open = new Set<string>(OPEN_TICKET_STATUSES)
  const actions: EscalationAction[] = []

  for (const t of tickets) {
    if (!open.has(t.status)) continue
    const kind = getSlaBreachKind({
      sla_respond_by: t.sla_respond_by,
      sla_resolve_by: t.sla_resolve_by,
      status: t.status,
      first_response_at: t.first_response_at,
      resolved_at: t.resolved_at,
      now,
    })
    if (kind === 'none') continue

    const toPriority = bumpPriorityTowardCritical(t.priority)
    // Still escalate event even if already critical (priority may stay same).
    actions.push({
      ticketId: t.id,
      breachKind: kind,
      fromPriority: t.priority,
      toPriority,
    })
  }

  return actions
}
