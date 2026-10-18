import type { SpendRequest, SpendStatus } from '@/modules/spend/policy'

/** Statuses that contribute to true cost (paid / committed / requested). */
const COST_STATUSES = new Set<SpendStatus>(['pending', 'approved', 'needs_info'])

/** Prefer actual → approved → requested. */
export function spendAmountForTrueCost(spend: SpendRequest): number {
  if (spend.actualAmount != null && Number.isFinite(spend.actualAmount)) {
    return spend.actualAmount
  }
  if (spend.approvedAmount != null && Number.isFinite(spend.approvedAmount)) {
    return spend.approvedAmount
  }
  return Number.isFinite(spend.requestedAmount) ? spend.requestedAmount : 0
}

export function spendsContributeToTrueCost(spend: SpendRequest): boolean {
  return COST_STATUSES.has(spend.status)
}

export function sumTrueCost(spends: SpendRequest[]): number {
  return spends
    .filter(spendsContributeToTrueCost)
    .reduce((sum, row) => sum + spendAmountForTrueCost(row), 0)
}

export function formatIls(amount: number): string {
  const n = Math.round(amount)
  return `₪${n.toLocaleString('he-IL')}`
}

export type TrueCostBreakdown = {
  total: number
  paid: number
  approved: number
  pending: number
  count: number
}

export function trueCostBreakdown(spends: SpendRequest[]): TrueCostBreakdown {
  const relevant = spends.filter(spendsContributeToTrueCost)
  let paid = 0
  let approved = 0
  let pending = 0
  for (const row of relevant) {
    const amount = spendAmountForTrueCost(row)
    if (row.actualAmount != null) paid += amount
    else if (row.status === 'approved') approved += amount
    else pending += amount
  }
  return {
    total: paid + approved + pending,
    paid,
    approved,
    pending,
    count: relevant.length,
  }
}
