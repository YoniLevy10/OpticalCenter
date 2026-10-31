import { describe, expect, it } from 'vitest'
import type { SpendRequest } from '@/modules/spend/policy'
import {
  bandFromPrices,
  formatCostBand,
  formatRecordedAmount,
  recordedTicketAmount,
} from './estimate'

function spend(partial: Partial<SpendRequest> & Pick<SpendRequest, 'id'>): SpendRequest {
  return {
    storeId: 's',
    storeCode: '6001',
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

describe('formatCostBand', () => {
  it('keeps one recorded price as a point', () => {
    expect(formatCostBand(bandFromPrices([1800]))).toBe('₪1,800')
  })

  it('uses the recorded min and max as the range', () => {
    expect(formatCostBand(bandFromPrices([860, 700]))).toBe('₪700–₪860')
  })

  it('says there is no price when nothing was recorded', () => {
    expect(formatCostBand(null)).toBe('אין עדיין מחיר')
  })
})

describe('recordedTicketAmount', () => {
  it('uses only the quote written on that fault', () => {
    const spends = [
      spend({ id: 'a', ticketId: 't1', requestedAmount: 700 }),
      spend({ id: 'b', ticketId: 't2', requestedAmount: 860 }),
      spend({
        id: 'bundle',
        ticketId: 't1',
        requestedAmount: 1450,
        scope: 'bundle|vendor=|tickets=t1,t2',
      }),
    ]
    expect(formatRecordedAmount(recordedTicketAmount(spends, 't1'))).toBe('₪700')
    expect(formatRecordedAmount(recordedTicketAmount(spends, 't3'))).toBe('אין עדיין מחיר')
  })
})
