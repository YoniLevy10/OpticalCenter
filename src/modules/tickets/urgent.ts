import type { TicketPriority } from '@/modules/tickets/constants'

const URGENT = new Set<string>(['critical', 'high'])

/** דחוף = קריטי או גבוה. לא דחוף = בינוני או נמוך. */
export function priorityIsUrgent(priority: string): boolean {
  return URGENT.has(priority)
}

/**
 * The stored flag wins after Ari flips it.
 * Older rows without the column follow the priority.
 */
export function ticketIsUrgent(ticket: {
  urgent?: boolean | null
  priority: string
}): boolean {
  if (typeof ticket.urgent === 'boolean') return ticket.urgent
  return priorityIsUrgent(ticket.priority)
}

export function isTicketPriority(value: string): value is TicketPriority {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low'
}
