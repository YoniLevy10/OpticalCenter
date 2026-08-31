import {
  OPEN_TICKET_STATUSES,
  type TicketStatus,
} from '@/modules/tickets/constants'

export type UnassignedCandidate = {
  id: string
  status: string
  assigned_to: string | null
  created_at: string
  display_number?: string | null
  priority?: string | null
}

/**
 * Open tickets with no assignee older than thresholdMs.
 * Prefer intake statuses (new/triaged); still include other open+unassigned.
 */
export function selectUnassignedTimeouts(
  tickets: UnassignedCandidate[],
  thresholdMs: number,
  now = Date.now(),
): UnassignedCandidate[] {
  return tickets.filter((t) => {
    if (!OPEN_TICKET_STATUSES.includes(t.status as TicketStatus)) return false
    if (t.assigned_to) return false
    const age = now - new Date(t.created_at).getTime()
    return Number.isFinite(age) && age >= thresholdMs
  })
}

export function unassignedTimeoutMsFromEnv(): number {
  const hours = Number(process.env.UNASSIGNED_TIMEOUT_HOURS || '2')
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 2
  return safe * 60 * 60 * 1000
}
