import { isBreached, type QueueTicket } from '@/modules/tickets/queue'
import { plainStatus } from '@/components/ops/plain-labels'
import type { Locale } from '@/lib/i18n/locale'
import { phrase } from '@/lib/i18n/phrases'

export type DecisionItem = {
  id: string
  kind: 'ticket' | 'spend' | 'document' | 'verify' | 'task' | 'conflict'
  title: string
  storeCode: string
  storeName: string
  owner: string
  urgency: 'today' | 'overdue'
  action: string
  href: string
  ticketId?: string
  spendId?: string
}

function startOfDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

export function ticketDecision(
  ticket: QueueTicket,
  now = new Date(),
  locale: Locale = 'he',
): DecisionItem | null {
  const open = !['resolved', 'closed', 'cancelled'].includes(ticket.status)
  if (!open && ticket.status !== 'resolved') return null
  const breached = isBreached(ticket, now)
  const followUp = ticketFollowUp(ticket)
  const followLate = followUp ? new Date(followUp).getTime() < startOfDay(now) : false
  const needs =
    breached ||
    !ticket.assigned_to ||
    ticket.status === 'awaiting_info' ||
    ticket.status === 'waiting_vendor' ||
    ticket.status === 'waiting_parts' ||
    ticket.priority === 'critical' ||
    ticket.priority === 'high' ||
    followLate
  if (!needs) return null
  const overdue = breached || followLate
  const action = !ticket.assigned_to
    ? phrase(locale, 'לשייך')
    : ticket.status === 'awaiting_info'
      ? phrase(locale, 'לבקש מידע')
      : ticket.status === 'waiting_vendor'
        ? phrase(locale, 'לעקוב אחרי בעל המקצוע')
        : phrase(locale, 'לטפל')
  return {
    id: `ticket:${ticket.id}`,
    kind: 'ticket',
    title: ticket.title || ticket.description,
    storeCode: ticket.stores?.code ?? '—',
    storeName: ticket.stores?.name ?? phrase(locale, 'סניף'),
    owner: ticket.assigned_to ? phrase(locale, 'משויך') : phrase(locale, 'לא משויך'),
    urgency: overdue ? 'overdue' : 'today',
    action: `${action} · ${plainStatus(ticket.status, locale)}`,
    href: `/ops/tickets/${ticket.id}`,
    ticketId: ticket.id,
  }
}

function ticketFollowUp(ticket: QueueTicket): string | null {
  const extra = ticket as QueueTicket & { follow_up_at?: string | null }
  return extra.follow_up_at ?? null
}

export function splitDecisions(items: DecisionItem[]): {
  overdue: DecisionItem[]
  today: DecisionItem[]
} {
  return {
    overdue: items.filter((item) => item.urgency === 'overdue'),
    today: items.filter((item) => item.urgency === 'today'),
  }
}
