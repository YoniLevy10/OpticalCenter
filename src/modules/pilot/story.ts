import { parseBundleScope } from '@/modules/recommendations/commit'
import { recordedCategoryBands } from '@/modules/recommendations/estimate'
import { spendAmountForTrueCost, spendsContributeToTrueCost } from '@/modules/spend/true-cost'
import type { SpendRequest } from '@/modules/spend/policy'
import type { VendorOutcome } from '@/modules/vendors/outcomes'
import {
  OPEN_TICKET_STATUSES,
  normalizeTicketCategory,
  TICKET_CATEGORY_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { isBreached, type QueueTicket } from '@/modules/tickets/queue'
import type { PilotMoney } from './value'
import type { RetainFacts, WorstStore } from './retain'

function priorityRank(priority: string): number {
  if (priority === 'critical') return 0
  if (priority === 'high') return 1
  if (priority === 'medium') return 2
  return 3
}

export type ValueBar = {
  label: string
  amount: number
}

export function moneyBars(money: PilotMoney): ValueBar[] {
  return [
    { label: 'מחכה', amount: money.waiting },
    { label: 'אושר', amount: money.approved },
    { label: 'שולם', amount: money.paid },
    { label: 'חזרות', amount: money.repeatCost },
  ]
}

export function categorySpendBars(
  spends: SpendRequest[],
  categoryByTicketId: Record<string, string>,
): ValueBar[] {
  const totals = new Map<string, number>()
  for (const spend of spends) {
    if (parseBundleScope(spend.scope) || !spendsContributeToTrueCost(spend) || !spend.ticketId) {
      continue
    }
    const category = normalizeTicketCategory(categoryByTicketId[spend.ticketId] || 'other')
    const label = TICKET_CATEGORY_LABELS_HE[category] ?? 'אחר'
    totals.set(label, (totals.get(label) ?? 0) + spendAmountForTrueCost(spend))
  }
  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .filter((bar) => bar.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export function recordedRanges(
  spends: SpendRequest[],
  categoryByTicketId: Record<string, string>,
  outcomes: VendorOutcome[] = [],
): RetainFacts['ranges'] {
  return recordedCategoryBands({ outcomes, spends, categoryByTicketId }).map((band) => ({
    label: TICKET_CATEGORY_LABELS_HE[band.category] ?? 'אחר',
    low: band.low,
    high: band.high,
  }))
}

export function worstOpenStore(tickets: QueueTicket[], now = new Date()): WorstStore | null {
  const byStore = new Map<string, QueueTicket[]>()
  for (const ticket of tickets) {
    if (!OPEN_TICKET_STATUSES.includes(ticket.status as TicketStatus)) continue
    const key = ticket.store_id || ticket.stores?.code || ticket.id
    const list = byStore.get(key) ?? []
    list.push(ticket)
    byStore.set(key, list)
  }
  let worst: { overdue: number; open: number; name: string; lead: string } | null = null
  for (const group of byStore.values()) {
    const ranked = [...group].sort((a, b) => {
      const late = Number(isBreached(b, now)) - Number(isBreached(a, now))
      if (late !== 0) return late
      return priorityRank(a.priority) - priorityRank(b.priority)
    })
    const leadSource = ranked[0]!
    const overdue = ranked.filter((ticket) => isBreached(ticket, now)).length
    const candidate = {
      overdue,
      open: group.length,
      name: leadSource.stores?.name?.trim() || 'סניף',
      lead: (leadSource.title || leadSource.description || 'תקלה פתוחה').trim(),
    }
    if (
      !worst ||
      candidate.overdue > worst.overdue ||
      (candidate.overdue === worst.overdue && candidate.open > worst.open)
    ) {
      worst = candidate
    }
  }
  if (!worst) return null
  return {
    name: worst.name,
    open: worst.open,
    overdue: worst.overdue,
    lead: worst.lead,
  }
}

export function retainFacts(
  money: PilotMoney,
  repeats: number,
  bars: ValueBar[],
  ranges: RetainFacts['ranges'] = [],
  worstStore: WorstStore | null = null,
): RetainFacts {
  const top = bars[0]
  return {
    waiting: money.waiting,
    approved: money.approved,
    paid: money.paid,
    bundleSaved: money.bundleSaved,
    repeatCost: money.repeatCost,
    repeats,
    topCategory: top?.label ?? null,
    topCategoryAmount: top?.amount ?? 0,
    ranges,
    worstStore,
  }
}
