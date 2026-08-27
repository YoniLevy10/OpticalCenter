import {
  OPEN_TICKET_STATUSES,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { getSlaBreachKind } from '@/modules/tickets/sla'
import { activeSlaTarget } from '@/modules/tickets/sla-display'

/**
 * Queue semantics for the operational inbox.
 *
 * VIEW and FILTERS are orthogonal:
 *
 *   view    = which slice of the operation am I working  (one of, mutually exclusive)
 *   filters = status / priority / store / technician     (independent, combinable)
 *   sort    = how the slice is ordered
 */

export type QueueView =
  | 'all'
  | 'mine'
  | 'urgent'
  | 'unassigned'
  | 'attention'
  | 'open'
  | 'resolved'

export type QueueSort = 'urgency' | 'newest' | 'oldest' | 'sla'

export const QUEUE_VIEWS: { key: QueueView; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'mine', label: 'שלי' },
  { key: 'urgent', label: 'דחופות' },
  { key: 'unassigned', label: 'ללא אחראי' },
  { key: 'attention', label: 'דורש תשומת לב' },
  { key: 'open', label: 'פתוחות' },
  { key: 'resolved', label: 'נפתרו' },
]

export const QUEUE_SORTS: { key: QueueSort; label: string }[] = [
  { key: 'urgency', label: 'דחיפות' },
  { key: 'sla', label: 'SLA' },
  { key: 'newest', label: 'חדשות' },
  { key: 'oldest', label: 'ותיקות' },
]

export type QueueTicket = {
  id: string
  number?: number | null
  display_number?: string | null
  status: string
  priority: string
  category?: string
  description: string
  title?: string | null
  source?: string
  assigned_to?: string | null
  created_at: string
  updated_at?: string
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  store_id?: string
  organization_id?: string
  country_id?: string
  region_id?: string
  stores?: {
    code?: string
    name?: string
    city?: string | null
    address?: string | null
  } | null
}

export type QueueFilters = {
  view: QueueView
  status?: string
  priority?: string
  store?: string
  tech?: string
  q?: string
  sort: QueueSort
  /** Current actor — used by `mine` view; not serialized to the URL. */
  actorId?: string
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function isOpen(status: string): boolean {
  return OPEN_TICKET_STATUSES.includes(status as TicketStatus)
}

export function isBreached(t: QueueTicket, now = new Date()): boolean {
  return (
    getSlaBreachKind({
      sla_respond_by: t.sla_respond_by,
      sla_resolve_by: t.sla_resolve_by,
      status: t.status,
      first_response_at: t.first_response_at,
      resolved_at: t.resolved_at,
      now,
    }) !== 'none'
  )
}

/** Needs a human decision now: breached, critical, or open and unowned. */
export function needsAttention(t: QueueTicket, now = new Date()): boolean {
  if (!isOpen(t.status)) return false
  if (isBreached(t, now)) return true
  if (t.priority === 'critical') return true
  if (!t.assigned_to) return true
  return false
}

function isUrgentView(t: QueueTicket, now: Date): boolean {
  if (!isOpen(t.status)) return false
  if (t.priority === 'critical' || t.priority === 'high') return true
  return isBreached(t, now)
}

function matchesView(
  t: QueueTicket,
  view: QueueView,
  now: Date,
  actorId?: string,
): boolean {
  switch (view) {
    case 'attention':
      return needsAttention(t, now)
    case 'open':
      return isOpen(t.status)
    case 'unassigned':
      return isOpen(t.status) && !t.assigned_to
    case 'urgent':
      return isUrgentView(t, now)
    case 'mine':
      return Boolean(actorId) && t.assigned_to === actorId
    case 'resolved':
      return t.status === 'resolved' || t.status === 'closed'
    case 'all':
    default:
      return true
  }
}

function matchesSearch(t: QueueTicket, q: string): boolean {
  const haystack = [
    t.display_number ?? '',
    t.number != null ? `OC-${t.number}` : '',
    t.description,
    t.title ?? '',
    t.stores?.name ?? '',
    t.stores?.code ?? '',
    t.stores?.city ?? '',
    t.category ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

function sortValue(t: QueueTicket, sort: QueueSort, now: Date): number {
  switch (sort) {
    case 'urgency': {
      // Breached first, then priority, then oldest — the triage order.
      const breach = isBreached(t, now) ? 0 : 1
      const priority = PRIORITY_RANK[t.priority] ?? 9
      return breach * 100 + priority
    }
    case 'sla': {
      const { dueAt } = activeSlaTarget({ ...t, now })
      return dueAt ? new Date(dueAt).getTime() : Number.MAX_SAFE_INTEGER
    }
    case 'newest':
      return -new Date(t.created_at).getTime()
    case 'oldest':
    default:
      return new Date(t.created_at).getTime()
  }
}

export function applyQueue(
  tickets: QueueTicket[],
  filters: QueueFilters,
  now = new Date(),
): QueueTicket[] {
  const q = filters.q?.trim().toLowerCase()

  const filtered = tickets.filter((t) => {
    if (!matchesView(t, filters.view, now, filters.actorId)) return false
    if (filters.status && t.status !== filters.status) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.store && t.stores?.code !== filters.store) return false
    if (filters.tech === 'none' && t.assigned_to) return false
    if (filters.tech && filters.tech !== 'none' && t.assigned_to !== filters.tech)
      return false
    if (q && !matchesSearch(t, q)) return false
    return true
  })

  return filtered.sort((a, b) => {
    const diff = sortValue(a, filters.sort, now) - sortValue(b, filters.sort, now)
    if (diff !== 0) return diff
    // Stable tie-break: oldest first, so nothing starves at the bottom.
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

/** Live counts for the attention strip — these are filter links, not KPI cards. */
export function queueCounts(tickets: QueueTicket[], now = new Date()) {
  let breached = 0
  let critical = 0
  let unassigned = 0
  let open = 0

  for (const t of tickets) {
    if (!isOpen(t.status)) continue
    open += 1
    if (isBreached(t, now)) breached += 1
    if (t.priority === 'critical') critical += 1
    if (!t.assigned_to) unassigned += 1
  }

  return { open, breached, critical, unassigned }
}

export function viewCounts(
  tickets: QueueTicket[],
  now = new Date(),
  actorId?: string,
) {
  return QUEUE_VIEWS.reduce<Record<QueueView, number>>(
    (acc, v) => {
      acc[v.key] = tickets.filter((t) =>
        matchesView(t, v.key, now, actorId),
      ).length
      return acc
    },
    {} as Record<QueueView, number>,
  )
}

export function parseQueueParams(sp: Record<string, string | undefined>): QueueFilters {
  const view = (QUEUE_VIEWS.find((v) => v.key === sp.view)?.key ??
    'all') as QueueView
  const sort = (QUEUE_SORTS.find((s) => s.key === sp.sort)?.key ??
    'urgency') as QueueSort
  return {
    view,
    sort,
    status: sp.status?.trim() || undefined,
    priority: sp.priority?.trim() || undefined,
    store: sp.store?.trim() || undefined,
    tech: sp.tech?.trim() || undefined,
    q: sp.q?.trim() || undefined,
  }
}

/** Build a queue URL preserving every dimension except the ones overridden. */
export function queueHref(
  filters: Partial<QueueFilters>,
  overrides: Partial<QueueFilters> = {},
): string {
  const merged = { ...filters, ...overrides }
  const params = new URLSearchParams()
  if (merged.view && merged.view !== 'all') params.set('view', merged.view)
  if (merged.sort && merged.sort !== 'urgency') params.set('sort', merged.sort)
  if (merged.status) params.set('status', merged.status)
  if (merged.priority) params.set('priority', merged.priority)
  if (merged.store) params.set('store', merged.store)
  if (merged.tech) params.set('tech', merged.tech)
  if (merged.q) params.set('q', merged.q)
  const qs = params.toString()
  return qs ? `/ops/tickets?${qs}` : '/ops/tickets'
}

export function activeFilterCount(filters: QueueFilters): number {
  return [filters.status, filters.priority, filters.store, filters.tech].filter(
    Boolean,
  ).length
}
