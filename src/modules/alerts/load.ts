import 'server-only'

import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import type { Actor } from '@/lib/auth/types'
import type { Locale } from '@/lib/i18n/locale'
import { listRecentAuditEvents } from '@/modules/audit/service'
import { ledgerDecisions } from '@/modules/decisions/from-ledger'
import {
  ticketDecision,
  type DecisionItem,
} from '@/modules/decisions/queue'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import type { QueueTicket } from '@/modules/tickets/queue'
import { listTickets } from '@/modules/tickets/service'
import {
  composeAlertsCenter,
  type AlertMessage,
  type AlertsCenterResult,
} from './center'

function historySummary(event: {
  event_type: string
  payload: Record<string, unknown>
}): string {
  switch (event.event_type) {
    case 'status_changed':
      return 'שינוי סטטוס'
    case 'assigned':
      return 'שויכה לטכנאי'
    case 'created':
      return 'תקלה נוצרה'
    case 'sla_breached':
      return 'חריגת SLA'
    case 'partner_dispatched':
      return 'שיגור לספק'
    case 'note_added':
      return 'נוספה הערה'
    case 'photo_added':
      return 'נוספה תמונה'
    default:
      return event.event_type
  }
}

/**
 * Load alerts from existing surfaces only. Never calls notifyAri / WA / email.
 */
export async function loadAlertsCenter(input: {
  actor: Actor | null
  locale: Locale
}): Promise<AlertsCenterResult> {
  let ticketsFailed = false
  let ledgerFailed = false
  let historyFailed = false

  let tickets: QueueTicket[] = []
  try {
    const [openResult, resolvedResult] = await Promise.all([
      listTickets({
        limit: 150,
        statuses: [...OPEN_TICKET_STATUSES],
      }),
      listTickets({
        limit: 80,
        statuses: ['resolved'],
      }),
    ])
    const fetched = [
      ...(openResult.tickets ?? []),
      ...(resolvedResult.tickets ?? []),
    ] as unknown as QueueTicket[]
    tickets = input.actor
      ? scopeTicketsForActor(input.actor, fetched)
      : fetched
  } catch {
    ticketsFailed = true
    tickets = []
  }

  let decisions: DecisionItem[] = []
  try {
    await hydrateOpsLedger()
    const ticketDecisions = tickets
      .map((t) => ticketDecision(t, new Date(), input.locale))
      .filter((item): item is DecisionItem => item != null)
    const ledger = ledgerDecisions(new Date(), input.locale)
    decisions = [...ticketDecisions, ...ledger]
  } catch {
    ledgerFailed = true
    // Still keep ticket-derived decisions if tickets loaded.
    decisions = tickets
      .map((t) => ticketDecision(t, new Date(), input.locale))
      .filter((item): item is DecisionItem => item != null)
  }

  let history: AlertMessage[] = []
  try {
    const { events } = await listRecentAuditEvents(80)
    history = events.map((event) => ({
      id: event.id,
      at: event.created_at,
      summary: historySummary({
        event_type: event.event_type,
        payload: event.payload ?? {},
      }),
      href: event.ticket_id ? `/ops/tickets/${event.ticket_id}` : null,
      ticketId: event.ticket_id,
    }))
  } catch {
    historyFailed = true
    history = []
  }

  return composeAlertsCenter({
    tickets: ticketsFailed ? null : tickets,
    ticketsFailed,
    decisions: ledgerFailed && ticketsFailed ? null : decisions,
    ledgerFailed,
    history: historyFailed ? null : history,
    historyFailed,
    locale: input.locale,
    actor: input.actor,
  })
}
