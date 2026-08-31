/**
 * Novice-first UX copy — human Hebrew for primary surfaces.
 * Internal status keys stay in the data model; UI maps through these helpers.
 */

import type { TicketStatus } from '@/modules/tickets/constants'
import { isBreached, type QueueTicket } from '@/modules/tickets/queue'

/** Preferred human ticket states (docs: novice-first redesign). */
export const HUMAN_TICKET_STATUS_HE: Record<TicketStatus, string> = {
  new: 'חדש',
  triaged: 'מחכה לטיפול',
  assigned: 'מחכה לטיפול',
  in_progress: 'בטיפול',
  waiting_parts: 'מחכה לחלק',
  resolved: 'הסתיים',
  closed: 'הסתיים',
  cancelled: 'בוטל',
}

export function humanTicketStatus(status: string): string {
  return HUMAN_TICKET_STATUS_HE[status as TicketStatus] ?? status
}

export function greetingHe(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'בוקר טוב'
  if (hour < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

export function relativeMinutesHe(iso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'עכשיו'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דקות`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'אתמול' : `לפני ${days} ימים`
}

export type NextActionHint = {
  /** Short question / heading */
  title: string
  /** Plain-language explanation */
  body: string
  /** Primary CTA label when applicable */
  cta?: string
  kind: 'assign' | 'start' | 'parts' | 'resolve' | 'done' | 'overdue' | 'info'
}

/**
 * Interpret ticket operational state into a next step a non-technical user understands.
 */
export function ticketNextAction(
  ticket: {
    status: string
    assigned_to?: string | null
    sla_respond_by?: string | null
    sla_resolve_by?: string | null
    first_response_at?: string | null
    resolved_at?: string | null
  },
  now = new Date(),
): NextActionHint {
  const status = ticket.status as TicketStatus
  const breached = isBreached(ticket as QueueTicket, now)

  if (status === 'resolved' || status === 'closed') {
    return {
      title: 'התקלה הסתיימה',
      body: 'אין פעולה נוספת כרגע. אפשר לחזור לרשימת התקלות.',
      kind: 'done',
    }
  }

  if (status === 'cancelled') {
    return {
      title: 'התקלה בוטלה',
      body: 'אין צורך לטפל בה.',
      kind: 'done',
    }
  }

  if (status === 'waiting_parts') {
    return {
      title: 'מה צריך לעשות?',
      body: 'הטכנאי מחכה לחלק. כשהחלק מגיע — אפשר להמשיך בטיפול או לסמן שהסתיים.',
      cta: 'סמן כטופל',
      kind: 'parts',
    }
  }

  if (!ticket.assigned_to) {
    return {
      title: 'מה צריך לעשות?',
      body: breached
        ? 'עדיין לא נבחר טכנאי, וזמן הטיפול שהוגדר כבר עבר.'
        : 'עדיין לא נבחר טכנאי.',
      cta: 'בחר טכנאי',
      kind: 'assign',
    }
  }

  if (status === 'new' || status === 'triaged' || status === 'assigned') {
    return {
      title: 'מה צריך לעשות?',
      body: breached
        ? 'נבחר טכנאי, אבל זמן הטיפול שהוגדר עבר — כדאי להתחיל לטפל.'
        : 'יש טכנאי. אפשר להתחיל לטפל בתקלה.',
      cta: 'התחל טיפול',
      kind: 'start',
    }
  }

  if (status === 'in_progress') {
    return {
      title: 'מה צריך לעשות?',
      body: breached
        ? 'הטיפול בעיצומו, וזמן הטיפול שהוגדר עבר — בדקו אם אפשר לסיים או לעדכן.'
        : 'הטיפול בעיצומו. כשסיימתם — סמנו שהסתיים.',
      cta: 'סמן כטופל',
      kind: 'resolve',
    }
  }

  return {
    title: 'מצב התקלה',
    body: humanTicketStatus(status),
    kind: 'info',
  }
}

export type AttentionItem = {
  id: string
  kind: 'ticket' | 'message'
  eyebrow: string
  title: string
  subtitle: string
  href: string
  cta: string
  hot?: boolean
}

export function ticketAttentionItem(
  t: QueueTicket,
  now = new Date(),
): AttentionItem {
  const display =
    t.display_number ?? (t.number != null ? `OC-${t.number}` : 'תקלה')
  const store = t.stores?.name ?? 'סניף לא ידוע'
  const title = (t.title || t.description || 'תקלה').trim()
  const next = ticketNextAction(t, now)
  const breached = isBreached(t, now)

  let eyebrow = 'תקלה'
  if (breached) eyebrow = 'זמן הטיפול עבר'
  else if (!t.assigned_to) eyebrow = 'תקלה חדשה · עדיין בלי טכנאי'
  else if (t.status === 'waiting_parts') eyebrow = 'מחכה לחלק'

  return {
    id: t.id,
    kind: 'ticket',
    eyebrow,
    title: title.length > 72 ? `${title.slice(0, 70)}…` : title,
    subtitle: `${store} · ${display} · ${relativeMinutesHe(t.created_at, now)}`,
    href: `/ops/tickets/${t.id}`,
    cta: next.cta ?? 'פתח תקלה',
    hot: breached || !t.assigned_to,
  }
}
