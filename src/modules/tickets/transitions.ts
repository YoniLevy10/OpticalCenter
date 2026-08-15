import type { TicketStatus } from '@/modules/tickets/constants'

export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  new: ['triaged', 'assigned', 'cancelled'],
  triaged: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['waiting_parts', 'resolved', 'cancelled'],
  waiting_parts: ['in_progress', 'resolved', 'cancelled'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  cancelled: [],
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to)
}

export function assertTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`מעבר סטטוס לא חוקי: ${from} → ${to}`)
  }
}

export function nextStatuses(from: TicketStatus): TicketStatus[] {
  return [...(ALLOWED_TRANSITIONS[from] ?? [])]
}

export function isTicketStatus(value: string): value is TicketStatus {
  return [
    'new',
    'triaged',
    'assigned',
    'in_progress',
    'waiting_parts',
    'resolved',
    'closed',
    'cancelled',
  ].includes(value)
}
