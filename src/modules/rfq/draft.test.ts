import { describe, expect, it } from 'vitest'
import {
  assertDraftOnly,
  captureQuoteRecord,
  composeRfqDraftBody,
  createRfqDraftRecord,
} from './draft'

describe('RFQ draft (C07)', () => {
  it('composes store / trade / tickets / docs / timing without inventing prices', () => {
    const body = composeRfqDraftBody({
      storeLabel: '#6018 · דיזנגוף',
      trade: 'hvac',
      ticketLabels: ['OC-18001'],
      documentNotes: ['תמונת נזילה'],
      timingNote: 'עד יום ה׳',
    })
    expect(body).toContain('סניף: #6018 · דיזנגוף')
    expect(body).toContain('hvac')
    expect(body).toContain('OC-18001')
    expect(body).toContain('תמונת נזילה')
    expect(body).toContain('עד יום ה׳')
    expect(body).toContain('טיוטה — לא נשלחה')
    expect(body).not.toMatch(/\d+\s*₪/)
    expect(body).not.toMatch(/מחיר מומלץ|הערכה/)
  })

  it('creates draft-only records', () => {
    const draft = createRfqDraftRecord({
      trade: 'electrical',
      ticket_ids: ['ticket-1'],
      store_code: '6018',
      store_name: 'דיזנגוף',
      document_notes: ['חוזה'],
      timing_note: 'מחר',
    })
    expect(draft.status).toBe('draft')
    expect(draft.quotes).toEqual([])
    expect(draft.ticket_ids).toEqual(['ticket-1'])
    assertDraftOnly(draft)
  })

  it('rejects empty trade or tickets', () => {
    expect(() =>
      createRfqDraftRecord({ trade: '  ', ticket_ids: ['a'] }),
    ).toThrow(/מקצוע/)
    expect(() =>
      createRfqDraftRecord({ trade: 'hvac', ticket_ids: [] }),
    ).toThrow(/תקלה/)
  })

  it('captures real quotes with optional amount — never invents', () => {
    const withAmount = captureQuoteRecord({
      source: 'אורי כהן · מידרג',
      quoted_at: '2026-10-17',
      currency: 'ILS',
      amount: 1200,
      vat_included: true,
      valid_until: '2026-10-31',
    })
    expect(withAmount.amount).toBe(1200)
    expect(withAmount.vat_included).toBe(true)

    const metaOnly = captureQuoteRecord({
      source: 'טלפון מהספק',
      quoted_at: '2026-10-17',
    })
    expect(metaOnly.amount).toBeNull()
    expect(metaOnly.currency).toBe('ILS')
  })

  it('rejects invalid amounts', () => {
    expect(() =>
      captureQuoteRecord({
        source: 'x',
        quoted_at: '2026-10-17',
        amount: -1,
      }),
    ).toThrow(/סכום/)
    expect(() =>
      captureQuoteRecord({ source: '', quoted_at: '2026-10-17' }),
    ).toThrow(/מקור/)
  })
})
