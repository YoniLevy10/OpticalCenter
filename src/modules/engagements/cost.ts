export type ClosedEngagementCost = {
  storeCode: string
  storeName: string
  approvedAmount: number
  closedAt: string
}

export type AnnualStoreCost = {
  storeCode: string
  storeName: string
  amount: number
}

/** Approved amounts of visits the store already confirmed, for one calendar year. */
export function annualMaintenanceCost(
  rows: ClosedEngagementCost[],
  year: number,
): { year: number; stores: AnnualStoreCost[]; network: number } {
  const byStore = new Map<string, AnnualStoreCost>()
  for (const row of rows) {
    const closed = new Date(row.closedAt)
    if (Number.isNaN(closed.getTime()) || closed.getUTCFullYear() !== year) continue
    if (!(row.approvedAmount > 0)) continue
    const key = row.storeCode || row.storeName
    const prev = byStore.get(key) ?? {
      storeCode: row.storeCode,
      storeName: row.storeName || row.storeCode || 'חנות',
      amount: 0,
    }
    prev.amount += row.approvedAmount
    byStore.set(key, prev)
  }
  const stores = [...byStore.values()].sort((a, b) => b.amount - a.amount)
  const network = stores.reduce((sum, row) => sum + row.amount, 0)
  return { year, stores, network }
}
