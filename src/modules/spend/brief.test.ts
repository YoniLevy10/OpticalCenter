import { describe, expect, it } from 'vitest'
import type { SpendRequest } from '@/modules/spend/policy'
import { approvalBrief } from './brief'

function spend(partial: Partial<SpendRequest> = {}): SpendRequest {
  return {
    id: 's',
    storeId: 'store',
    storeCode: '6001',
    storeName: 'ירושלים כיכר ציון',
    ticketId: 't',
    reason: 'חשמלאי חירום ללוח',
    vendorName: 'חשמלנט · חשמל',
    requestedAmount: 1800,
    approvedAmount: null,
    actualAmount: null,
    scope: null,
    status: 'pending',
    urgent: true,
    requestedBy: 'קרן · ירושלים כיכר ציון',
    decidedBy: null,
    decidedAt: null,
    needsReapproval: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('approvalBrief', () => {
  it('says the fault, who asked, and who would go', () => {
    expect(approvalBrief(spend(), 'ריח שרוף בלוח החשמל')).toEqual({
      what: 'ריח שרוף בלוח החשמל בסניף ירושלים כיכר ציון.',
      who: 'מטעם קרן.',
      whom: 'חשמלנט · חשמל, ₪1,800.',
    })
  })

  it('marks a combined visit and a missing vendor', () => {
    const lines = approvalBrief(
      spend({
        vendorName: null,
        requestedBy: null,
        reason: 'מנעול ומדפסת',
        scope: 'bundle|vendor=|tickets=a,b',
      }),
      null,
    )
    expect(lines.what).toBe('ביקור אחד ל־2 תקלות בסניף ירושלים כיכר ציון. מנעול ומדפסת')
    expect(lines.who).toBe('מטעם מנהל הסניף.')
    expect(lines.whom).toBe('עדיין בלי ספק, ₪1,800.')
  })
})