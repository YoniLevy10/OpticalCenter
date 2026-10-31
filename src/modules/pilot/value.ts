import { parseBundleScope } from '@/modules/recommendations/commit'
import {
  spendAmountForTrueCost,
  spendsContributeToTrueCost,
} from '@/modules/spend/true-cost'
import type { SpendRequest } from '@/modules/spend/policy'

export type PilotMoney = {
  waiting: number
  approved: number
  paid: number
  /** Separate quotes minus a cheaper combined visit, only when every fault has its own quote. */
  bundleSaved: number
  repeatCost: number
}

function individualSpend(spends: SpendRequest[], ticketId: string): SpendRequest | undefined {
  return spends.find(
    (row) =>
      row.ticketId === ticketId &&
      !parseBundleScope(row.scope) &&
      spendsContributeToTrueCost(row),
  )
}

export function pilotMoney(spends: SpendRequest[], repeatTicketIds: string[]): PilotMoney {
  const repeats = new Set(repeatTicketIds)
  let waiting = 0
  let approved = 0
  let paid = 0
  let bundleSaved = 0
  let repeatCost = 0

  for (const spend of spends) {
    if (parseBundleScope(spend.scope) || !spendsContributeToTrueCost(spend)) continue
    const amount = spendAmountForTrueCost(spend)
    if (spend.actualAmount != null) paid += amount
    else if (spend.status === 'approved') approved += amount
    else waiting += amount
    if (spend.ticketId && repeats.has(spend.ticketId)) repeatCost += amount
  }

  for (const spend of spends) {
    const bundle = parseBundleScope(spend.scope)
    if (!bundle || !spendsContributeToTrueCost(spend)) continue
    const parts = bundle.ticketIds.map((id) => individualSpend(spends, id))
    if (parts.some((row) => !row)) continue
    const separate = parts.reduce((sum, row) => sum + spendAmountForTrueCost(row!), 0)
    const together = spendAmountForTrueCost(spend)
    if (separate > together) bundleSaved += separate - together
  }

  return { waiting, approved, paid, bundleSaved, repeatCost }
}
