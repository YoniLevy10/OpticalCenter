import { describe, expect, it } from 'vitest'
import {
  assetRepeatStats,
  findRecurrences,
  previousFixFailed,
  type HistoryTicket,
} from './recurrence'

function ticket(patch: Partial<HistoryTicket> & Pick<HistoryTicket, 'id'>): HistoryTicket {
  return {
    storeId: 's',
    category: 'hvac',
    assetId: 'ac',
    description: 'מזגן',
    status: 'new',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...patch,
  }
}

describe('recurrence and first-time fix', () => {
  it('does not treat a different asset in the same store as a repeat', () => {
    const current = ticket({ id: 'new' })
    const hits = findRecurrences(current, [
      ticket({ id: 'other-machine', assetId: 'lens', createdAt: '2026-09-01T00:00:00.000Z' }),
      ticket({ id: 'same', createdAt: '2026-08-01T00:00:00.000Z' }),
    ])
    expect(hits.map((hit) => hit.ticket.id)).toEqual(['same'])
  })

  it('matches store and category when the current ticket has no asset', () => {
    const current = ticket({ id: 'new', assetId: null })
    const hits = findRecurrences(current, [
      ticket({
        id: 'older',
        assetId: 'ac',
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
      ticket({
        id: 'elsewhere',
        assetId: null,
        storeId: 'other',
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
    ])
    expect(hits.map((hit) => hit.ticket.id)).toEqual(['older'])
  })

  it('flags a fix that was followed within 30 days on the same asset', () => {
    const current = ticket({ id: 'again', createdAt: '2026-10-10T00:00:00.000Z' })
    const failed = previousFixFailed(current, [
      ticket({
        id: 'fixed',
        status: 'resolved',
        createdAt: '2026-10-01T00:00:00.000Z',
        resolvedAt: '2026-10-02T00:00:00.000Z',
      }),
    ])
    expect(failed?.id).toBe('fixed')
  })

  it('lets a fix stand after 30 quiet days', () => {
    const current = ticket({ id: 'later', createdAt: '2026-12-01T00:00:00.000Z' })
    expect(
      previousFixFailed(current, [
        ticket({
          id: 'fixed',
          status: 'resolved',
          createdAt: '2026-10-01T00:00:00.000Z',
          resolvedAt: '2026-10-02T00:00:00.000Z',
        }),
      ]),
    ).toBeNull()
  })

  it('without an asset, only the same store and category can fail the previous fix', () => {
    const current = ticket({
      id: 'again',
      assetId: null,
      createdAt: '2026-10-10T00:00:00.000Z',
    })
    expect(
      previousFixFailed(current, [
        ticket({
          id: 'other-trade',
          assetId: null,
          category: 'plumbing',
          status: 'resolved',
          resolvedAt: '2026-10-02T00:00:00.000Z',
        }),
      ]),
    ).toBeNull()
    expect(
      previousFixFailed(current, [
        ticket({
          id: 'same-trade',
          assetId: null,
          status: 'closed',
          resolvedAt: '2026-10-02T00:00:00.000Z',
        }),
      ])?.id,
    ).toBe('same-trade')
  })

  it('counts repeats on an asset and a fix that did not hold', () => {
    const stats = assetRepeatStats('ac', [
      ticket({
        id: 'first',
        status: 'resolved',
        createdAt: '2026-09-01T00:00:00.000Z',
        resolvedAt: '2026-09-02T00:00:00.000Z',
      }),
      ticket({
        id: 'second',
        status: 'new',
        createdAt: '2026-09-20T00:00:00.000Z',
      }),
    ])
    expect(stats.repeats).toBe(1)
    expect(stats.lastFixFailed).toBe(true)
  })
})
