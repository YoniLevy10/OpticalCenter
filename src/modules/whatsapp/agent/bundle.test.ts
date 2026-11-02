import { describe, expect, it } from 'vitest'
import type { FaultPro } from '@/modules/professionals/match-fault'
import type { VendorOutcome } from '@/modules/vendors/outcomes'
import { intakeBundleHandoff, recommendBundles, type BundleFault } from './bundle'

function fault(partial: Partial<BundleFault> & Pick<BundleFault, 'id' | 'summary'>): BundleFault {
  return {
    storeId: 'store-1',
    storeName: 'דיזנגוף',
    category: 'plumbing',
    priority: 'medium',
    status: 'new',
    createdAt: '2026-10-01T10:00:00.000Z',
    ...partial,
  }
}

const andy: FaultPro = {
  id: 'pro-andy',
  full_name: 'אנדי',
  phone: '0500000000',
  trade: 'אינסטלציה',
  notes: null,
  use_count: 4,
}

const priced: VendorOutcome = {
  vendorId: 'v1',
  vendorName: 'אנדי',
  category: 'plumbing',
  region: null,
  price: 400,
  arrivalMinutes: 60,
  quality: 5,
  warrantyNote: null,
  success: true,
}

describe('recommendBundles', () => {
  it('bundles three leaks at one store into one recommendation', () => {
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז בשירותים' }),
        fault({ id: 'b', summary: 'טפטוף בכיור' }),
        fault({ id: 'c', summary: 'ניאגרה רצה' }),
      ],
      professionals: [andy],
      outcomes: [priced],
    })
    expect(cards).toHaveLength(1)
    expect(cards[0]?.kind).toBe('bundle')
    expect(cards[0]?.ticketIds).toEqual(['a', 'b', 'c'])
    expect(cards[0]?.sentence).toContain('3 נזילות')
    expect(cards[0]?.sentence).toContain('אנדי')
    expect(cards[0]?.professionalSource).toBe('outcome')
    expect(cards[0]?.costLine).toBe('נרשם מחיר אחד: ₪400')
  })

  it('does not recommend a single leak', () => {
    expect(
      recommendBundles({ open: [fault({ id: 'a', summary: 'ברז' })] }).length,
    ).toBe(0)
  })

  it('keeps two stores as two recommendations', () => {
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז' }),
        fault({ id: 'b', summary: 'כיור' }),
        fault({
          id: 'c',
          storeId: 'store-2',
          storeName: 'חיפה',
          summary: 'ברז',
        }),
        fault({
          id: 'd',
          storeId: 'store-2',
          storeName: 'חיפה',
          summary: 'כיור',
        }),
      ],
    })
    expect(cards.map((card) => card.storeName).sort()).toEqual(['דיזנגוף', 'חיפה'])
  })

  it('says a professional is missing instead of inventing a name', () => {
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז' }),
        fault({ id: 'b', summary: 'כיור' }),
      ],
    })
    expect(cards[0]?.sentence).toContain('חסר איש מקצוע')
    expect(cards[0]?.professionalName).toBeNull()
  })

  it('uses a prior successful vendor before the directory', () => {
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז' }),
        fault({ id: 'b', summary: 'כיור' }),
      ],
      professionals: [{ ...andy, full_name: 'משה', id: 'other' }],
      outcomes: [priced],
    })
    expect(cards[0]?.professionalName).toBe('אנדי')
    expect(cards[0]?.professionalSource).toBe('outcome')
  })

  it('states a range when two recorded prices exist', () => {
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז' }),
        fault({ id: 'b', summary: 'כיור' }),
      ],
      outcomes: [priced, { ...priced, price: 900 }],
    })
    expect(cards[0]?.costLine).toBe('טווח לפי מחירים שנרשמו: ₪400–₪900')
  })

  it('says there is no price when history has none', () => {
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז' }),
        fault({ id: 'b', summary: 'כיור' }),
      ],
      professionals: [andy],
    })
    expect(cards[0]?.costLine).toBe('אין עדיין מחיר')
  })

  it('treats a critical fault as act-now, not a wait-for-bundle', () => {
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז', priority: 'critical' }),
        fault({ id: 'b', summary: 'כיור' }),
        fault({ id: 'c', summary: 'ניאגרה' }),
      ],
    })
    expect(cards.find((card) => card.kind === 'urgent')?.ticketIds).toEqual(['a', 'b', 'c'])
    expect(cards.find((card) => card.kind === 'urgent')?.sentence).toContain('לא דחופות')
    expect(cards.find((card) => card.kind === 'bundle')).toBeUndefined()
  })

  it('suggests a non-urgent fault in the same district, at another store', () => {
    const cards = recommendBundles({
      open: [
        fault({
          id: 'a',
          summary: 'המזגן כבה',
          priority: 'high',
          regionId: 'north',
        }),
        fault({
          id: 'b',
          summary: 'ניקיון ויטרינה',
          category: 'cleaning',
          priority: 'low',
          storeId: 'store-2',
          storeName: 'נהריה',
          regionId: 'north',
        }),
        fault({
          id: 'c',
          summary: 'שלט',
          category: 'electrical',
          priority: 'low',
          storeId: 'store-3',
          storeName: 'אילת',
          regionId: 'south',
        }),
      ],
    })
    expect(cards.find((card) => card.kind === 'urgent')?.ticketIds).toEqual(['a', 'b'])
  })

  it('turns a repeat into a check, not another bundled call', () => {
    const history = [1, 2, 3].map((n) =>
      fault({
        id: `old-${n}`,
        summary: 'נזילה',
        status: 'closed',
        createdAt: `2026-${String(7 + n).padStart(2, '0')}-01T10:00:00.000Z`,
      }),
    )
    const cards = recommendBundles({
      open: [
        fault({ id: 'a', summary: 'ברז', createdAt: '2026-10-20T10:00:00.000Z' }),
        fault({ id: 'b', summary: 'כיור', createdAt: '2026-10-21T10:00:00.000Z' }),
      ],
      history,
      now: new Date('2026-10-31T10:00:00.000Z'),
    })
    expect(cards).toHaveLength(1)
    expect(cards[0]?.kind).toBe('prevention')
    expect(cards[0]?.sentence).toContain('בדיקה')
  })
})

describe('intakeBundleHandoff', () => {
  it('does not text the store to wait for another report', () => {
    const handoff = intakeBundleHandoff({
      storeId: 'store-1',
      storeName: 'דיזנגוף',
      category: 'plumbing',
      description: 'טפטוף קטן בכיור',
      priority: 'medium',
      ticketId: 'new',
      createdAt: '2026-10-31T10:00:00.000Z',
      open: [],
    })
    expect(handoff).toBe('wait')
  })

  it('sends the store person now on a significant leak', () => {
    const handoff = intakeBundleHandoff({
      storeId: 'store-1',
      storeName: 'דיזנגוף',
      category: 'plumbing',
      description: 'נזילה משמעותית מהתקרה',
      priority: 'high',
      ticketId: 'new',
      createdAt: '2026-10-31T10:00:00.000Z',
      open: [],
    })
    expect(handoff).toBe('now')
  })
})
