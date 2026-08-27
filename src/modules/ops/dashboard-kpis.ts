import {
  OPEN_TICKET_STATUSES,
  TICKET_CATEGORY_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { isBreached, type QueueTicket } from '@/modules/tickets/queue'

function isOpen(status: string): boolean {
  return OPEN_TICKET_STATUSES.includes(status as TicketStatus)
}

/** Queue-front statuses: waiting to start work (not yet in progress). */
const QUEUE_FRONT: TicketStatus[] = ['new', 'triaged', 'assigned']

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
  /** All open (non-terminal) tickets. */
  open: number
  /** new + triaged + assigned (not yet in progress). */
  queueFront: number
  inProgress: number
  waiting: number
  done: number
  urgent: number
  urgentTickets: QueueTicket[]
  slaBreaches: number
  breached: number
  unassigned: number
  byCategory: CategoryBar[]
  topStores: StoreRank[]
  techLoad: TechLoad[]
  /** Open tickets that need action now — breached first, then unassigned. */
  exceptions: QueueTicket[]
  recentActivity: QueueTicket[]
  /** Average hours to resolve among resolved tickets with resolved_at. */
  avgResolveHours: number | null
  resolvedCount: number
}

export type SlaReport = {
  resolvedWithinSla: number
  resolvedBreached: number
  openBreached: number
  pctWithinSla: number | null
}

export type StoreSlaRow = {
  code: string
  name: string
  open: number
  breached: number
  total: number
}

/** Filter tickets by created_at date range (inclusive). */
export function filterTicketsByDateRange<T extends { created_at: string }>(
  tickets: T[],
  from?: string | null,
  to?: string | null,
): T[] {
  const fromMs = from ? new Date(from).getTime() : null
  const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : null
  return tickets.filter((t) => {
    const ms = new Date(t.created_at).getTime()
    if (fromMs != null && ms < fromMs) return false
    if (toMs != null && ms > toMs) return false
    return true
  })
}

function wasResolvedWithinSla(
  t: QueueTicket,
): boolean | null {
  if (t.status !== 'resolved' && t.status !== 'closed') return null
  if (!t.resolved_at || !t.sla_resolve_by) return null
  return new Date(t.resolved_at).getTime() <= new Date(t.sla_resolve_by).getTime()
}

export function computeSlaReport(
  tickets: QueueTicket[],
  now = new Date(),
): SlaReport {
  let resolvedWithinSla = 0
  let resolvedBreached = 0
  let openBreached = 0

  for (const t of tickets) {
    if (isOpen(t.status) && isBreached(t, now)) {
      openBreached += 1
      continue
    }
    const within = wasResolvedWithinSla(t)
    if (within === true) resolvedWithinSla += 1
    if (within === false) resolvedBreached += 1
  }

  const resolvedTotal = resolvedWithinSla + resolvedBreached
  return {
    resolvedWithinSla,
    resolvedBreached,
    openBreached,
    pctWithinSla:
      resolvedTotal > 0
        ? Math.round((resolvedWithinSla / resolvedTotal) * 1000) / 10
        : null,
  }
}

export function computeStoreReport(
  tickets: QueueTicket[],
  now = new Date(),
): StoreSlaRow[] {
  const map = new Map<string, StoreSlaRow>()

  for (const t of tickets) {
    const code = t.stores?.code ?? '—'
    const name = t.stores?.name ?? 'ללא חנות'
    const prev = map.get(code) ?? { code, name, open: 0, breached: 0, total: 0 }
    prev.total += 1
    if (isOpen(t.status)) prev.open += 1
    if (isBreached(t, now)) prev.breached += 1
    map.set(code, prev)
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}

function isUrgent(t: QueueTicket, now: Date): boolean {
  if (!isOpen(t.status)) return false
  if (t.priority === 'critical' || t.priority === 'high') return true
  return isBreached(t, now)
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
  let queueFront = 0
  let inProgress = 0
  let waiting = 0
  let done = 0
  let breached = 0
  let unassigned = 0
  const categoryMap = new Map<string, number>()
  const storeMap = new Map<string, { code: string; name: string; count: number }>()
  const techMap = new Map<string, number>()
  const exceptionCandidates: QueueTicket[] = []
  const urgentCandidates: QueueTicket[] = []

  for (const t of tickets) {
    if (QUEUE_FRONT.includes(t.status as TicketStatus)) queueFront += 1
    if (t.status === 'in_progress') inProgress += 1
    if (t.status === 'waiting_parts') waiting += 1
    if (t.status === 'resolved' || t.status === 'closed') done += 1
  }

  for (const t of openTickets) {
    const breachedNow = isBreached(t, now)
    if (breachedNow) breached += 1
    if (!t.assigned_to) unassigned += 1
    if (breachedNow || !t.assigned_to) exceptionCandidates.push(t)
    if (isUrgent(t, now)) urgentCandidates.push(t)

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

  const urgentTickets = [...urgentCandidates]
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

  const recentActivity = [...tickets]
    .sort((a, b) => {
      const aMs = new Date(a.updated_at ?? a.created_at).getTime()
      const bMs = new Date(b.updated_at ?? b.created_at).getTime()
      return bMs - aMs
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
    queueFront,
    inProgress,
    waiting,
    done,
    urgent: urgentCandidates.length,
    urgentTickets,
    slaBreaches: breached,
    breached,
    unassigned,
    byCategory,
    topStores,
    techLoad,
    exceptions,
    recentActivity,
    avgResolveHours:
      resolvedCount > 0
        ? Math.round((resolveHoursSum / resolvedCount) * 10) / 10
        : null,
    resolvedCount,
  }
}
