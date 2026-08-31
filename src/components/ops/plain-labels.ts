/**
 * Plain-Hebrew UI labels for non-technical operators.
 * Data-model keys stay in modules; screens map through these helpers.
 */

import {
  OPEN_TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { isBreached, type QueueTicket } from '@/modules/tickets/queue'

/** Status words a non-technical person understands. */
export const PLAIN_STATUS_HE: Record<TicketStatus, string> = {
  new: 'חדשה',
  triaged: 'פתוחה',
  assigned: 'משויכת',
  in_progress: 'בטיפול',
  waiting_parts: 'ממתינה',
  resolved: 'הסתיימה',
  closed: 'הסתיימה',
  cancelled: 'בוטלה',
}

/** Urgency — never "critical / high / medium". */
export const PLAIN_URGENCY_HE: Record<TicketPriority, string> = {
  critical: 'דחוף',
  high: 'חשוב',
  medium: 'רגיל',
  low: 'רגיל',
}

export function plainStatus(status: string): string {
  return PLAIN_STATUS_HE[status as TicketStatus] ?? status
}

export function plainUrgency(priority: string | null | undefined): string {
  if (!priority) return 'רגיל'
  return PLAIN_URGENCY_HE[priority as TicketPriority] ?? 'רגיל'
}

export function isTicketOpen(status: string): boolean {
  return OPEN_TICKET_STATUSES.includes(status as TicketStatus)
}

export function isTicketResolved(status: string): boolean {
  return status === 'resolved' || status === 'closed'
}

/** "פתוחה כבר שעתיים" / "חורגת" — never SLA jargon. */
export function plainOpenForHe(
  createdAt: string,
  ticket?: Pick<
    QueueTicket,
    | 'status'
    | 'sla_respond_by'
    | 'sla_resolve_by'
    | 'first_response_at'
    | 'resolved_at'
  >,
  now = new Date(),
): { text: string; overdue: boolean } {
  if (ticket && isBreached(ticket as QueueTicket, now)) {
    return { text: 'חורגת', overdue: true }
  }
  const started = new Date(createdAt).getTime()
  if (Number.isNaN(started)) return { text: '—', overdue: false }
  const diff = Math.max(0, now.getTime() - started)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return { text: 'נפתחה זה עתה', overdue: false }
  if (mins < 60) return { text: `פתוחה כבר ${mins} דקות`, overdue: false }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return {
      text: hours === 1 ? 'פתוחה כבר שעה' : `פתוחה כבר ${hours} שעות`,
      overdue: false,
    }
  }
  const days = Math.floor(hours / 24)
  return {
    text: days === 1 ? 'פתוחה כבר יום' : `פתוחה כבר ${days} ימים`,
    overdue: false,
  }
}

/** Friendly relative time for "Opened" rows. */
export function plainAgoHe(iso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'עכשיו'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דקות`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'אתמול' : `לפני ${days} ימים`
}

export function storeLabel(
  store: { name?: string | null; code?: string | null } | null | undefined,
): string {
  if (!store) return 'ללא חנות'
  const name = store.name?.trim() || 'חנות'
  if (store.code) return `#${store.code} · ${name}`
  return name
}
