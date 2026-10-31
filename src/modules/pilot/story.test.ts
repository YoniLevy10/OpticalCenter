import { describe, expect, it } from 'vitest'
import type { SpendRequest } from '@/modules/spend/policy'
import { answerRetention, openingLine } from './retain'
import { categorySpendBars, retainFacts } from './story'
import type { PilotMoney } from './value'

const money: PilotMoney = {
  waiting: 1800,
  approved: 700,
  paid: 0,
  bundleSaved: 0,
  repeatCost: 0,
}

function spend(partial: Partial<SpendRequest> & Pick<SpendRequest, 'id'>): SpendRequest {
  return {
    storeId: 's',
    storeCode: '6001',
    storeName: 'סניף',
    ticketId: 't',
    reason: 'תיקון',
    vendorName: null,
    requestedAmount: 100,
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

describe('categorySpendBars', () => {
  it('groups recorded quotes by fault type and skips a combined visit', () => {
    const bars = categorySpendBars(
      [
        spend({ id: 'a', ticketId: 'a', requestedAmount: 1800 }),
        spend({ id: 'b', ticketId: 'b', requestedAmount: 2400 }),
        spend({
          id: 'bundle',
          requestedAmount: 3200,
          scope: 'bundle|vendor=|tickets=a,b',
        }),
      ],
      { a: 'electrical', b: 'hvac' },
    )
    expect(bars.map((bar) => bar.label)).toEqual(['מיזוג', 'חשמל'])
    expect(bars[0]?.amount).toBe(2400)
  })
})

describe('answerRetention', () => {
  const facts = retainFacts(money, 0, [{ label: 'חשמל', amount: 1800 }])

  it('opens on his store and his money', () => {
    const withStore = {
      ...facts,
      worstStore: {
        name: 'חדרה',
        open: 1,
        overdue: 1,
        lead: 'מצלמת הכניסה כבויה',
      },
    }
    expect(openingLine(withStore)).toContain('חדרה דורש אותך')
    expect(openingLine(withStore)).toContain('מחכים לאישור')
    expect(openingLine(withStore)).not.toContain('להישאר')
    const aboutStore = answerRetention('תיתן לי קצת יותר מידע על הסניף הכי בעייתי', withStore)
    expect(aboutStore).toContain('חדרה')
    expect(aboutStore).toContain('מצלמת הכניסה כבויה')
    expect(aboutStore).not.toContain('בדשבורד')
    expect(aboutStore).not.toContain('להישאר')
    const why = answerRetention('למה להישאר?', facts)
    expect(why).toContain('חשמל')
    expect(why).not.toContain('להישאר')
    expect(answerRetention('כמה יעלה?', facts)).toContain('אין עדיין מחיר שנרשם')
    expect(answerRetention('מה הטווח?', { ...facts, ranges: [{ label: 'מיזוג', low: 2400, high: 4100 }] })).toContain(
      '₪2,400–₪4,100',
    )
  })
})
