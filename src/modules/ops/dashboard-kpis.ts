import {
  OPEN_TICKET_STATUSES,
  TICKET_CATEGORY_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { isBreached, type QueueTicket } from '@/modules/tickets/queue'

function isOpen(status: string): boolean {
  return OPEN_TICKET_STATUSES.includes(status as TicketStatus)
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export type CategoryBar = { key: string; label: string; count: number }
export type StoreRank = { code: string; name: string; count: number }
export type TechLoad = { id: string; name: string; count: number }

export type DashboardKpis = {
  open: number
  breached: number
  unassigned: number
  byCategory: CategoryBar[]
  topStores: StoreRank[]
  techLoad: TechLoad[]
  /** Open tickets that need action now — breached first, then unassigned. */
  exceptions: QueueTicket[]
  /** Average hours to resolve among resolved tickets with resolved_at. */
  avgResolveHours: number | null
  resolvedCount: number
}

/**
 * Aggregate open-ticket KPIs for the HQ dashboard.
 * Uses the same breach semantics as the inbox (`isBreached`).
 */
export function computeDashboardKpis(
  tickets: QueueTicket[],
  technicians: { id: string; name: string }[] = [],
  now = new Date(),
): DashboardKpis {
  const openTickets = tickets.filter((t) => isOpen(t.status))
  let breached = 0
  let unassigned = 0
  const categoryMap = new Map<string, number>()
  const storeMap = new Map<string, { code: string; name: string; count: number }>()
  const techMap = new Map<string, number>()
  const exceptionCandidates: QueueTicket[] = []

  for (const t of openTickets) {
    const breachedNow = isBreached(t, now)
    if (breachedNow) breached += 1
    if (!t.assigned_to) unassigned += 1
    if (breachedNow || !t.assigned_to) exceptionCandidates.push(t)

    const cat = t.category?.trim() || 'other'
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1)

    const code = t.stores?.code ?? '—'
    const name = t.stores?.name ?? 'ללא חנות'
    const prev = storeMap.get(code)
    if (prev) prev.count += 1
    else storeMap.set(code, { code, name, count: 1 })

    if (t.assigned_to) {
      techMap.set(t.assigned_to, (techMap.get(t.assigned_to) ?? 0) + 1)
    }
  }

  const byCategory = [...categoryMap.entries()]
    .map(([key, count]) => ({
      key,
      label: TICKET_CATEGORY_LABELS_HE[key] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const topStores = [...storeMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const techName = (id: string) =>
    technicians.find((t) => t.id === id)?.name ?? `${id.slice(0, 6)}…`

  const techLoad = [...techMap.entries()]
    .map(([id, count]) => ({ id, name: techName(id), count }))
    .sort((a, b) => b.count - a.count)

  const exceptions = [...exceptionCandidates]
    .sort((a, b) => {
      const aBreach = isBreached(a, now) ? 0 : 1
      const bBreach = isBreached(b, now) ? 0 : 1
      if (aBreach !== bBreach) return aBreach - bBreach
      const aPri = PRIORITY_RANK[a.priority ?? ''] ?? 9
      const bPri = PRIORITY_RANK[b.priority ?? ''] ?? 9
      if (aPri !== bPri) return aPri - bPri
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    .slice(0, 8)

  let resolveHoursSum = 0
  let resolvedCount = 0
  for (const t of tickets) {
    if (t.status !== 'resolved' && t.status !== 'closed') continue
    const resolvedAt = t.resolved_at
    if (!resolvedAt) continue
    const hours =
      (new Date(resolvedAt).getTime() - new Date(t.created_at).getTime()) /
      3_600_000
    if (Number.isFinite(hours) && hours >= 0) {
      resolveHoursSum += hours
      resolvedCount += 1
    }
  }

  return {
    open: openTickets.length,
    breached,
    unassigned,
    byCategory,
    topStores,
    techLoad,
    exceptions,
    avgResolveHours:
      resolvedCount > 0
        ? Math.round((resolveHoursSum / resolvedCount) * 10) / 10
        : null,
    resolvedCount,
  }
}
