import {
  OPEN_TICKET_STATUSES,
  TICKET_CATEGORY_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { isBreached, type QueueTicket } from '@/modules/tickets/queue'

function isOpen(status: string): boolean {
  return OPEN_TICKET_STATUSES.includes(status as TicketStatus)
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

  for (const t of openTickets) {
    if (isBreached(t, now)) breached += 1
    if (!t.assigned_to) unassigned += 1

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

  return {
    open: openTickets.length,
    breached,
    unassigned,
    byCategory,
    topStores,
    techLoad,
  }
}
