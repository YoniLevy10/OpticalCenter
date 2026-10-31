import { describe, expect, it } from 'vitest'
import type { SpendRequest } from '@/modules/spend/policy'
import { pilotMoney } from './value'

function spend(partial: Partial<SpendRequest> & Pick<SpendRequest, 'id'>): SpendRequest {
  return {
    storeId: 's',
    storeCode: '6006',
    storeName: 'סניף',
    ticketId: null,
    reason: 'תיקון',
    vendorName: null,
    requestedAmount: 0,
    approvedAmount: null,
    actualAmount: null,
    scope: null,
    status: 'pending',
    urgent: false,
    requestedBy: null,
    decidedBy: null,
    decidedAt: null,
    needsReapproval: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('pilotMoney', () => {
  it('counts a combined visit as savings only when each fault already has its own quote', () => {
    const money = pilotMoney(
      [
        spend({ id: 'hvac', ticketId: 'a', requestedAmount: 2400 }),
        spend({ id: 'plumb', ticketId: 'b', requestedAmount: 900 }),
        spend({
          id: 'bundle',
          ticketId: 'a',
          requestedAmount: 2100,
          scope: 'bundle|vendor=|tickets=a,b',
        }),
        spend({
          id: 'approved',
          ticketId: 'c',
          requestedAmount: 700,
          approvedAmount: 700,
          status: 'approved',
        }),
      ],
      ['c'],
    )
    expect(money.bundleSaved).toBe(1200)
    expect(money.waiting).toBe(3300)
    expect(money.approved).toBe(700)
    expect(money.repeatCost).toBe(700)
  })

  it('does not invent savings when the second fault has no quote', () => {
    const money = pilotMoney(
      [
        spend({ id: 'one', ticketId: 'a', requestedAmount: 2400 }),
        spend({
          id: 'bundle',
          ticketId: 'a',
          requestedAmount: 2100,
          scope: 'bundle|vendor=|tickets=a,b',
        }),
      ],
      [],
    )
    expect(money.bundleSaved).toBe(0)
  })
})
