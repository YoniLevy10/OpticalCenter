import type { TicketPriority } from '@/modules/tickets/constants'
import { TICKET_PRIORITY_LABELS_HE } from '@/modules/tickets/constants'

/** Respond / resolve windows in hours, by priority. */
export const SLA_WINDOWS: Record<
  TicketPriority,
  { respondHours: number; resolveHours: number }
> = {
  critical: { respondHours: 1, resolveHours: 4 },
  high: { respondHours: 2, resolveHours: 8 },
  medium: { respondHours: 4, resolveHours: 24 },
  low: { respondHours: 8, resolveHours: 72 },
}

function addHours(from: Date, hours: number) {
  return new Date(from.getTime() + hours * 3600_000).toISOString()
}

export function computeSlaTimestamps(priority: TicketPriority, now = new Date()) {
  const w = SLA_WINDOWS[priority]
  return {
    sla_respond_by: addHours(now, w.respondHours),
    sla_resolve_by: addHours(now, w.resolveHours),
  }
}

export type SlaBreachKind = 'respond' | 'resolve' | 'none'

export function isSlaBreached(opts: {
  priority?: TicketPriority | string | null
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  status?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  now?: Date
}): boolean {
  return getSlaBreachKind(opts) !== 'none'
}

export function getSlaBreachKind(opts: {
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  status?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  now?: Date
}): SlaBreachKind {
  const now = opts.now ?? new Date()
  const status = opts.status ?? ''
  const closed = status === 'closed' || status === 'cancelled'

  if (
    opts.sla_resolve_by &&
    !opts.resolved_at &&
    !closed &&
    new Date(opts.sla_resolve_by).getTime() < now.getTime()
  ) {
    return 'resolve'
  }

  const responded =
    Boolean(opts.first_response_at) ||
    status === 'in_progress' ||
    status === 'waiting_parts' ||
    status === 'resolved' ||
    status === 'closed'

  if (
    opts.sla_respond_by &&
    !responded &&
    !closed &&
    new Date(opts.sla_respond_by).getTime() < now.getTime()
  ) {
    return 'respond'
  }

  return 'none'
}

/** Short Hebrew label for SLA window / breach state. */
export function formatSlaLabelHe(opts: {
  priority: TicketPriority | string
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  status?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  now?: Date
}): string {
  const priority = opts.priority as TicketPriority
  const window = SLA_WINDOWS[priority]
  const priorityLabel = TICKET_PRIORITY_LABELS_HE[priority] ?? String(opts.priority)
  const kind = getSlaBreachKind(opts)

  if (kind === 'resolve') return `חריגת SLA סיום · ${priorityLabel}`
  if (kind === 'respond') return `חריגת SLA תגובה · ${priorityLabel}`

  if (window) {
    return `SLA ${priorityLabel}: תגובה ${window.respondHours}ש׳ · סיום ${window.resolveHours}ש׳`
  }
  return `SLA · ${priorityLabel}`
}
