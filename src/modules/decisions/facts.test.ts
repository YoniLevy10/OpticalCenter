import { describe, expect, it } from 'vitest'
import { ticketFacts } from './facts'
import type { HistoryTicket } from '@/modules/tickets/recurrence'

const current: HistoryTicket = {
  id: 'now',
  storeId: 's1',
  category: 'hvac',
  assetId: 'ac-1',
  description: 'המזגן לא מקרר',
  status: 'new',
  createdAt: '2026-10-28T10:00:00.000Z',
}

describe('ticketFacts', () => {
  it('names a first event, no cost, and no repeat', () => {
    const facts = ticketFacts(current, [current], [], 'מיזוג', new Date('2026-10-28T11:00:00.000Z'))
    expect(facts.root).toBe('אירוע ראשון · מיזוג')
    expect(facts.cost).toBe('אין עלות')
    expect(facts.repeat).toBe('לא חזרה')
    expect(facts.sla.length).toBeGreaterThan(0)
  })

  it('counts an earlier fault on the same asset and shows approved cost', () => {
    const earlier: HistoryTicket = {
      ...current,
      id: 'old',
      createdAt: '2026-08-01T10:00:00.000Z',
      status: 'closed',
      resolvedAt: '2026-08-02T10:00:00.000Z',
    }
    const facts = ticketFacts(
      current,
      [current, earlier],
      [
        {
          ticketId: 'now',
          status: 'approved',
          approvedAmount: 450,
          actualAmount: null,
          requestedAmount: 450,
        },
      ],
      'מיזוג',
    )
    expect(facts.repeat).toBe('1 פעמים')
    expect(facts.cost).toBe('₪450')
    expect(facts.root).toContain('אותו ציוד')
  })
})