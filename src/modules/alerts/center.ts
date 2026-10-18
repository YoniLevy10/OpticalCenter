/**
 * Ops alerts center — aggregates existing decision / exception / lifecycle
 * surfaces into one deduped action list. Not a parallel notification engine:
 * items appear only while their source still needs attention, and page loads
 * never send WA/email.
 *
 * Auth helpers stay here (server-only call sites). Client UI must import from
 * `./types` so the browser bundle never pulls `@/lib/auth/types` → `node:crypto`.
 */

import { isBreached, type QueueTicket } from '@/modules/tickets/queue'
import {
  ticketDecision,
  type DecisionItem,
} from '@/modules/decisions/queue'
import type { Locale } from '@/lib/i18n/locale'
import { phrase } from '@/lib/i18n/phrases'
import type { Actor } from '@/lib/auth/types'
import { actorHasHqAccess } from '@/lib/auth/types'
import type {
  AlertBucket,
  AlertMessage,
  AlertSeverity,
  AlertSource,
  AlertsCenterResult,
  OpsAlert,
} from './types'

export type {
  AlertBucket,
  AlertMessage,
  AlertSeverity,
  AlertSource,
  AlertSourceHealth,
  AlertsCenterResult,
  OpsAlert,
} from './types'
export { filterAlerts, splitAlertBuckets } from './types'

const WAITING_STATUSES = new Set([
  'awaiting_info',
  'waiting_vendor',
  'waiting_parts',
])

function uniqReasons(reasons: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const reason of reasons) {
    const key = reason.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function severityRank(severity: AlertSeverity): number {
  switch (severity) {
    case 'critical':
      return 0
    case 'high':
      return 1
    case 'medium':
      return 2
    default:
      return 3
  }
}

function bucketRank(bucket: AlertBucket): number {
  switch (bucket) {
    case 'urgent_overdue':
      return 0
    case 'needs_decision':
      return 1
    default:
      return 2
  }
}

function mergeSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return severityRank(a) <= severityRank(b) ? a : b
}

function mergeBucket(a: AlertBucket, b: AlertBucket): AlertBucket {
  return bucketRank(a) <= bucketRank(b) ? a : b
}

function ticketSeverity(ticket: QueueTicket, now: Date): AlertSeverity {
  if (ticket.priority === 'critical') return 'critical'
  if (ticket.priority === 'high' || isBreached(ticket, now)) return 'high'
  if (ticket.priority === 'low') return 'low'
  return 'medium'
}

function ticketReasons(
  ticket: QueueTicket,
  now: Date,
  locale: Locale,
): string[] {
  const reasons: string[] = []
  if (isBreached(ticket, now)) reasons.push(phrase(locale, 'חריגת SLA'))
  if (!ticket.assigned_to) reasons.push(phrase(locale, 'לא משויך'))
  if (ticket.status === 'waiting_parts') {
    reasons.push(phrase(locale, 'ממתין לחלקים'))
  } else if (ticket.status === 'waiting_vendor') {
    reasons.push(phrase(locale, 'ממתין לספק'))
  } else if (ticket.status === 'awaiting_info') {
    reasons.push(phrase(locale, 'ממתין למידע'))
  } else if (ticket.status === 'resolved') {
    reasons.push(phrase(locale, 'ממתין לאישור חנות'))
  }
  if (ticket.priority === 'critical' || ticket.priority === 'high') {
    reasons.push(phrase(locale, 'דחיפות גבוהה'))
  }
  return reasons
}

function bucketForTicket(ticket: QueueTicket, urgency: DecisionItem['urgency']): AlertBucket {
  if (urgency === 'overdue' || isBreached(ticket) || ticket.priority === 'critical') {
    return 'urgent_overdue'
  }
  if (
    WAITING_STATUSES.has(ticket.status) ||
    ticket.status === 'resolved'
  ) {
    return 'waiting'
  }
  return 'needs_decision'
}

function bucketForDecision(item: DecisionItem): AlertBucket {
  if (item.urgency === 'overdue') return 'urgent_overdue'
  if (item.kind === 'verify') return 'waiting'
  if (item.kind === 'spend' || item.kind === 'document' || item.kind === 'conflict') {
    return 'needs_decision'
  }
  if (item.kind === 'task') return 'needs_decision'
  // Ticket-shaped decisions without the ticket row fall back by action text.
  if (
    item.action.includes('לעקוב') ||
    item.action.includes('מידע') ||
    item.action.includes('לאמת')
  ) {
    return 'waiting'
  }
  return 'needs_decision'
}

function severityForDecision(item: DecisionItem): AlertSeverity {
  if (item.urgency === 'overdue') return 'high'
  if (item.kind === 'spend' || item.kind === 'conflict') return 'high'
  if (item.kind === 'document' || item.kind === 'verify') return 'medium'
  return 'medium'
}

function sourceForDecision(kind: DecisionItem['kind']): AlertSource {
  if (kind === 'ticket') return 'ticket'
  if (kind === 'spend') return 'spend'
  if (kind === 'document') return 'document'
  if (kind === 'verify') return 'verify'
  if (kind === 'task') return 'task'
  return 'conflict'
}

function upsertAlert(map: Map<string, OpsAlert>, next: OpsAlert): void {
  const prev = map.get(next.id)
  if (!prev) {
    map.set(next.id, {
      ...next,
      reasons: uniqReasons(next.reasons),
    })
    return
  }
  const newer =
    new Date(next.at).getTime() >= new Date(prev.at).getTime() ? next : prev
  const older = newer === next ? prev : next
  map.set(next.id, {
    ...newer,
    reasons: uniqReasons([...prev.reasons, ...next.reasons]),
    severity: mergeSeverity(prev.severity, next.severity),
    bucket: mergeBucket(prev.bucket, next.bucket),
    nextAction: newer.nextAction || older.nextAction,
    owner: newer.owner || older.owner,
    href: newer.href || older.href,
    ticketId: newer.ticketId ?? older.ticketId,
    spendId: newer.spendId ?? older.spendId,
  })
}

/** Convert a decision-queue item into an ops alert (no side effects). */
export function alertFromDecision(
  item: DecisionItem,
  at: string,
  locale: Locale = 'he',
  ticket?: QueueTicket | null,
  now = new Date(),
): OpsAlert {
  const source = sourceForDecision(item.kind)
  const reasons = ticket
    ? ticketReasons(ticket, now, locale)
    : uniqReasons([item.action, item.urgency === 'overdue' ? phrase(locale, 'באיחור') : ''].filter(Boolean))
  const severity = ticket
    ? mergeSeverity(severityForDecision(item), ticketSeverity(ticket, now))
    : severityForDecision(item)
  const bucket = ticket
    ? mergeBucket(bucketForDecision(item), bucketForTicket(ticket, item.urgency))
    : bucketForDecision(item)

  return {
    id: item.id,
    source,
    title: item.title,
    reasons: uniqReasons(reasons.length ? reasons : [item.action]),
    severity,
    owner: item.owner,
    at: ticket?.updated_at ?? ticket?.created_at ?? at,
    nextAction: item.action,
    href: item.href,
    bucket,
    storeCode: item.storeCode,
    storeName: item.storeName,
    ticketId: item.ticketId ?? ticket?.id,
    spendId: item.spendId,
  }
}

/** Awaiting store confirm — waiting-on-someone, not a desk decision. */
export function alertFromStoreConfirm(
  ticket: QueueTicket,
  locale: Locale = 'he',
): OpsAlert {
  return {
    id: `ticket:${ticket.id}`,
    source: 'store_confirm',
    title: ticket.title || ticket.description,
    reasons: [phrase(locale, 'ממתין לאישור חנות')],
    severity: 'medium',
    owner: phrase(locale, 'חנות'),
    at: ticket.updated_at ?? ticket.created_at,
    nextAction: phrase(locale, 'לעקוב אחרי אישור חנות'),
    href: `/ops/tickets/${ticket.id}`,
    bucket: 'waiting',
    storeCode: ticket.stores?.code ?? '—',
    storeName: ticket.stores?.name ?? phrase(locale, 'סניף'),
    ticketId: ticket.id,
  }
}

/**
 * Build open alerts from decisions + tickets. Dedupes by item id so the same
 * ticket/spend/doc appears once even if it surfaces from multiple helpers.
 */
export function buildOpenAlerts(input: {
  tickets: QueueTicket[]
  decisions: DecisionItem[]
  now?: Date
  locale?: Locale
}): OpsAlert[] {
  const now = input.now ?? new Date()
  const locale = input.locale ?? 'he'
  const at = now.toISOString()
  const byId = new Map(input.tickets.map((t) => [t.id, t]))
  const map = new Map<string, OpsAlert>()

  for (const decision of input.decisions) {
    const ticket = decision.ticketId ? byId.get(decision.ticketId) : undefined
    upsertAlert(map, alertFromDecision(decision, at, locale, ticket, now))
  }

  // Exception / store-confirm tickets that did not produce a decision row.
  for (const ticket of input.tickets) {
    if (ticket.status === 'resolved') {
      upsertAlert(map, alertFromStoreConfirm(ticket, locale))
      continue
    }
    const decision = ticketDecision(ticket, now, locale)
    if (!decision) continue
    upsertAlert(map, alertFromDecision(decision, at, locale, ticket, now))
  }

  return [...map.values()].sort((a, b) => {
    const bucket = bucketRank(a.bucket) - bucketRank(b.bucket)
    if (bucket !== 0) return bucket
    const sev = severityRank(a.severity) - severityRank(b.severity)
    if (sev !== 0) return sev
    return new Date(b.at).getTime() - new Date(a.at).getTime()
  })
}

/** HQ desk only — store/tech roles use their portals, not the alerts center. */
export function canAccessAlertsCenter(actor: Actor | null): boolean {
  if (!actor) return true // demo entry already gated by the page
  return actorHasHqAccess(actor)
}

/**
 * Defense-in-depth: non-HQ never sees the open list (even if a page forgets
 * the gate). HQ keeps the full aggregated set; ticket rows should already be
 * narrowed with `scopeTicketsForActor` before build.
 */
export function scopeAlertsForActor(
  actor: Actor | null,
  alerts: OpsAlert[],
): OpsAlert[] {
  if (!actor) return alerts
  if (!actorHasHqAccess(actor)) return []
  return alerts
}

/**
 * Compose center payload. Failed sources stay marked — callers must show a
 * failure banner instead of an empty “all clear” state.
 */
export function composeAlertsCenter(input: {
  tickets: QueueTicket[] | null
  ticketsFailed: boolean
  decisions: DecisionItem[] | null
  ledgerFailed: boolean
  history: AlertMessage[] | null
  historyFailed: boolean
  now?: Date
  locale?: Locale
  actor?: Actor | null
}): AlertsCenterResult {
  const tickets = input.tickets ?? []
  const decisions = input.decisions ?? []
  const openRaw = buildOpenAlerts({
    tickets,
    decisions,
    now: input.now,
    locale: input.locale,
  })
  const open = scopeAlertsForActor(input.actor ?? null, openRaw)

  return {
    open,
    history: input.history ?? [],
    sources: {
      tickets: input.ticketsFailed ? 'failed' : 'ok',
      ledger: input.ledgerFailed ? 'failed' : 'ok',
      history: input.historyFailed ? 'failed' : 'ok',
    },
    partialFailure:
      input.ticketsFailed || input.ledgerFailed || input.historyFailed,
  }
}
