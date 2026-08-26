export type LifecycleEvent =
  | 'assigned'
  | 'in_progress'
  | 'waiting_parts'
  | 'resolved'
  | 'closed'

export type LifecycleTicket = {
  id: string
  display_number?: string | null
  number?: number | null
  reporter_phone?: string | null
  status?: string | null
  stores?: { name?: string | null; code?: string | null } | null
  assignee?: { full_name?: string | null } | null
}

const LIFECYCLE_EVENTS = new Set<LifecycleEvent>([
  'assigned',
  'in_progress',
  'waiting_parts',
  'resolved',
  'closed',
])

/** Pure Hebrew templates for store reporter lifecycle updates (AI fallback base). */
export function lifecycleTemplate(
  event: LifecycleEvent,
  ticket: LifecycleTicket,
): string {
  const display =
    ticket.display_number ||
    (ticket.number != null ? `OC-${ticket.number}` : ticket.id.slice(0, 8))
  const storeName = ticket.stores?.name?.trim() || 'החנות'
  const techName = ticket.assignee?.full_name?.trim() || 'טכנאי'

  switch (event) {
    case 'assigned':
      return `טכנאי הוקצה לתקלה ${display} בחנות ${storeName}.\nשם הטכנאי: ${techName}`
    case 'in_progress':
      return `הטכנאי התחיל טיפול בתקלה ${display}.`
    case 'waiting_parts':
      return `ממתינים לחלקים לתקלה ${display} — עדכון יישלח.`
    case 'resolved':
      return `התקלה ${display} טופלה. תודה!`
    case 'closed':
      return `התקלה ${display} נסגרה.`
  }
}

export function isLifecycleEvent(value: string): value is LifecycleEvent {
  return LIFECYCLE_EVENTS.has(value as LifecycleEvent)
}

// Server-side notify + AI enhancement: lifecycle-notify.ts
