import type { SpendStatus } from '@/modules/spend/policy'

export type SpendCostInput = {
  ticketId: string | null
  status: SpendStatus | string
  approvedAmount: number | null
  actualAmount: number | null
  requestedAmount: number
}

export type TicketCostRef = {
  id: string
  assetId?: string | null
}

export type CostTotals = {
  /** Approved spend only. Pending never enters this number. */
  approved: number
  /** Still waiting on a person. Shown beside the total, not inside it. */
  pending: number
}

/** Approved jobs use the invoice amount when it exists, otherwise the approved amount. */
export function countedApprovedAmount(spend: SpendCostInput): number | null {
  if (spend.status !== 'approved') return null
  const amount = spend.actualAmount ?? spend.approvedAmount
  if (amount == null || !Number.isFinite(amount)) return null
  return amount
}

export function countedPendingAmount(spend: SpendCostInput): number | null {
  if (spend.status !== 'pending' && spend.status !== 'needs_info') return null
  if (!Number.isFinite(spend.requestedAmount)) return null
  return spend.requestedAmount
}

function addSpend(totals: CostTotals, spend: SpendCostInput) {
  const approved = countedApprovedAmount(spend)
  if (approved != null) totals.approved += approved
  const pending = countedPendingAmount(spend)
  if (pending != null) totals.pending += pending
}

export function summarizeTicketSpend(
  spends: SpendCostInput[],
  ticketId: string,
): CostTotals {
  const totals: CostTotals = { approved: 0, pending: 0 }
  for (const spend of spends) {
    if (spend.ticketId !== ticketId) continue
    addSpend(totals, spend)
  }
  return totals
}

/**
 * Lifetime cost of one asset. A spend counts only when its ticket points at
 * that asset. Unlinked spends stay off the asset.
 */
export function summarizeAssetSpend(
  spends: SpendCostInput[],
  tickets: TicketCostRef[],
  assetId: string,
): CostTotals {
  const ticketIds = new Set(
    tickets.filter((ticket) => ticket.assetId === assetId).map((ticket) => ticket.id),
  )
  const totals: CostTotals = { approved: 0, pending: 0 }
  for (const spend of spends) {
    if (!spend.ticketId || !ticketIds.has(spend.ticketId)) continue
    addSpend(totals, spend)
  }
  return totals
}

export function formatShekels(amount: number): string {
  return `₪${Math.round(amount).toLocaleString('he-IL')}`
}
