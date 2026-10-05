export type CatalogItem = {
  id: string
  name: string
  sku: string
}

export type StockQty = {
  itemId: string
  locationId: string
  quantity: number
  verified: boolean
}

export type AssetUnit = {
  id: string
  itemId: string
  storeId: string
  serial: string
}

export type StockMovement = {
  id: string
  itemId: string
  fromLocationId: string | null
  toLocationId: string | null
  quantity: number
  ticketId: string | null
  kind: 'in' | 'out' | 'transfer'
}

export function availableQuantity(rows: StockQty[], itemId: string, locationId: string): number {
  return rows
    .filter((row) => row.itemId === itemId && row.locationId === locationId)
    .reduce((sum, row) => sum + row.quantity, 0)
}

export function applyMovement(rows: StockQty[], movement: StockMovement): StockQty[] {
  const next = rows.map((row) => ({ ...row }))
  const touch = (locationId: string, delta: number) => {
    const row = next.find(
      (item) => item.itemId === movement.itemId && item.locationId === locationId,
    )
    if (row) row.quantity += delta
    else {
      next.push({
        itemId: movement.itemId,
        locationId,
        quantity: delta,
        verified: false,
      })
    }
  }
  if (movement.kind === 'in' && movement.toLocationId) touch(movement.toLocationId, movement.quantity)
  if (movement.kind === 'out' && movement.fromLocationId) {
    touch(movement.fromLocationId, -movement.quantity)
  }
  if (movement.kind === 'transfer' && movement.fromLocationId && movement.toLocationId) {
    touch(movement.fromLocationId, -movement.quantity)
    touch(movement.toLocationId, movement.quantity)
  }
  return next
}

export function canRequestPurchase(available: number, needed: number): boolean {
  return available < needed
}
