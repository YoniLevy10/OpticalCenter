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
import type { Locale } from '@/lib/i18n/locale'
import { phrase } from '@/lib/i18n/phrases'

/** Status words a non-technical person understands. */
export const PLAIN_STATUS_HE: Record<TicketStatus, string> = {
  new: 'חדשה',
  triaged: 'פתוחה',
  assigned: 'משויכת',
  awaiting_info: 'ממתינה למידע',
  in_progress: 'בטיפול',
  waiting_vendor: 'ממתינה לבעל מקצוע',
  waiting_parts: 'ממתינה לחלקים',
  resolved: 'ממתינה לאימות',
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

export function plainStatus(status: string, locale: Locale = 'he'): string {
  const he = PLAIN_STATUS_HE[status as TicketStatus]
  if (!he) return status
  return phrase(locale, he)
}

export function plainUrgency(
  priority: string | null | undefined,
  locale: Locale = 'he',
): string {
  if (!priority) return phrase(locale, 'רגיל')
  const he = PLAIN_URGENCY_HE[priority as TicketPriority] ?? 'רגיל'
  return phrase(locale, he)
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
  locale: Locale = 'he',
): { text: string; overdue: boolean } {
  if (ticket && isBreached(ticket as QueueTicket, now)) {
    return { text: phrase(locale, 'חורגת'), overdue: true }
  }
  const started = new Date(createdAt).getTime()
  if (Number.isNaN(started)) return { text: '—', overdue: false }
  const diff = Math.max(0, now.getTime() - started)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return { text: phrase(locale, 'נפתחה זה עתה'), overdue: false }
  if (mins < 60) {
    return { text: openFor(locale, mins, 'minute'), overdue: false }
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return { text: openFor(locale, hours, 'hour'), overdue: false }
  }
  const days = Math.floor(hours / 24)
  return { text: openFor(locale, days, 'day'), overdue: false }
}

function openFor(locale: Locale, count: number, unit: 'minute' | 'hour' | 'day'): string {
  if (locale === 'he') {
    if (unit === 'minute') return `פתוחה כבר ${count} דקות`
    if (unit === 'hour') return count === 1 ? 'פתוחה כבר שעה' : `פתוחה כבר ${count} שעות`
    return count === 1 ? 'פתוחה כבר יום' : `פתוחה כבר ${count} ימים`
  }
  if (locale === 'fr') {
    if (unit === 'minute') {
      return `Ouverte depuis ${count} minute${count === 1 ? '' : 's'}`
    }
    if (unit === 'hour') return `Ouverte depuis ${count} heure${count === 1 ? '' : 's'}`
    return `Ouverte depuis ${count} jour${count === 1 ? '' : 's'}`
  }
  if (unit === 'minute') return `Open for ${count} minute${count === 1 ? '' : 's'}`
  if (unit === 'hour') return `Open for ${count} hour${count === 1 ? '' : 's'}`
  return `Open for ${count} day${count === 1 ? '' : 's'}`
}

/** Friendly relative time for "Opened" rows. */
export function plainAgoHe(iso: string, now = new Date(), locale: Locale = 'he'): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return phrase(locale, 'עכשיו')
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return phrase(locale, 'עכשיו')
  if (locale !== 'he') return ago(locale, mins)
  if (mins < 60) return `לפני ${mins} דקות`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'אתמול' : `לפני ${days} ימים`
}

function ago(locale: Locale, mins: number): string {
  if (mins < 60) {
    return locale === 'fr' ? `il y a ${mins} min` : `${mins} min ago`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return locale === 'fr'
      ? `il y a ${hours} h`
      : `${hours} h ago`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) return phrase(locale, 'אתמול')
  return locale === 'fr' ? `il y a ${days} j` : `${days} d ago`
}

export function storeLabel(
  store: { name?: string | null; code?: string | null } | null | undefined,
  locale: Locale = 'he',
): string {
  if (!store) return phrase(locale, 'ללא חנות')
  const name = store.name?.trim() || phrase(locale, 'חנות')
  if (store.code) return `#${store.code} · ${name}`
  return name
}
