import { describe, expect, it } from 'vitest'
import { summarizeAssetSpend, summarizeTicketSpend } from './asset-cost'

const approved = {
  ticketId: 't1',
  status: 'approved' as const,
  approvedAmount: 400,
  actualAmount: 450,
  requestedAmount: 400,
}

describe('asset cost', () => {
  it('counts the actual amount of an approved spend and keeps pending beside it', () => {
    const totals = summarizeTicketSpend(
      [
        approved,
        {
          ticketId: 't1',
          status: 'pending',
          approvedAmount: null,
          actualAmount: null,
          requestedAmount: 80,
        },
        {
          ticketId: 't1',
          status: 'rejected',
          approvedAmount: null,
          actualAmount: null,
          requestedAmount: 999,
        },
      ],
      't1',
    )
    expect(totals.approved).toBe(450)
    expect(totals.pending).toBe(80)
  })

  it('falls back to the approved amount when no invoice amount exists', () => {
    const totals = summarizeTicketSpend(
      [{ ...approved, actualAmount: null }],
      't1',
    )
    expect(totals.approved).toBe(400)
  })

  it('does not roll a spend onto an asset when the ticket has no asset', () => {
    const spends = [
      approved,
      {
        ticketId: 'loose',
        status: 'approved' as const,
        approvedAmount: 1000,
        actualAmount: null,
        requestedAmount: 1000,
      },
    ]
    const tickets = [
      { id: 't1', assetId: 'ac' },
      { id: 'loose', assetId: null },
    ]
    expect(summarizeAssetSpend(spends, tickets, 'ac')).toEqual({
      approved: 450,
      pending: 0,
    })
    expect(summarizeAssetSpend(spends, tickets, 'other')).toEqual({
      approved: 0,
      pending: 0,
    })
  })
})
