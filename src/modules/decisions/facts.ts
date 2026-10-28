import type { SpendCostInput } from '@/modules/spend/asset-cost'
import { formatShekels, summarizeTicketSpend } from '@/modules/spend/asset-cost'
import {
  findRecurrences,
  previousFixFailed,
  type HistoryTicket,
} from '@/modules/tickets/recurrence'
import { getSlaView } from '@/modules/tickets/sla-display'

export type TicketFactSource = HistoryTicket & {
  priority?: string | null
  slaRespondBy?: string | null
  slaResolveBy?: string | null
  firstResponseAt?: string | null
}

export type TicketFacts = {
  /** Live SLA number. Color is applied by the caller from `slaCritical`. */
  sla: string
  slaCritical: boolean
  /** Approved shekels, otherwise a pending amount, otherwise none. */
  cost: string
  /** How many earlier same-fault tickets, or a first-time line. */
  repeat: string
  /** Why this fault is here: a failed fix, a known subject, or a first event. */
  root: string
}

export function ticketFacts(
  source: TicketFactSource,
  history: HistoryTicket[],
  spends: SpendCostInput[],
  categoryLabel: string,
  now = new Date(),
): TicketFacts {
  const hits = findRecurrences(source, history, 180, new Date(source.createdAt))
  const failed = previousFixFailed(source, history)
  const spend = summarizeTicketSpend(spends, source.id)
  const sla = getSlaView({
    priority: source.priority,
    status: source.status,
    created_at: source.createdAt,
    sla_respond_by: source.slaRespondBy,
    sla_resolve_by: source.slaResolveBy,
    first_response_at: source.firstResponseAt,
    resolved_at: source.resolvedAt,
    now,
  })
  const cost =
    spend.approved > 0
      ? formatShekels(spend.approved)
      : spend.pending > 0
        ? `ממתין ${formatShekels(spend.pending)}`
        : 'אין עלות'
  return {
    sla: sla.short,
    slaCritical: sla.tone === 'critical',
    cost,
    repeat: hits.length > 0 ? `${hits.length} פעמים` : 'לא חזרה',
    root: failed
      ? 'התיקון הקודם לא החזיק'
      : (hits[0]?.reason ?? `אירוע ראשון · ${categoryLabel}`),
  }
}
