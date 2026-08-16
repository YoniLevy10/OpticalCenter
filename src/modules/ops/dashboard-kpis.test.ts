import { describe, expect, it } from 'vitest'
import { computeDashboardKpis } from './dashboard-kpis'
import type { QueueTicket } from '@/modules/tickets/queue'

function ticket(partial: Partial<QueueTicket> & Pick<QueueTicket, 'id'>): QueueTicket {
  return {
    status: 'new',
    priority: 'medium',
    description: 'test',
    created_at: '2026-08-01T10:00:00.000Z',
    ...partial,
  }
}

describe('computeDashboardKpis', () => {
  it('counts open, breach, unassigned, category, store, tech', () => {
    const now = new Date('2026-08-16T12:00:00.000Z')
    const tickets: QueueTicket[] = [
      ticket({
        id: '1',
        status: 'new',
        category: 'hvac',
        assigned_to: null,
        stores: { code: '172', name: 'TA' },
        sla_respond_by: '2026-08-16T11:00:00.000Z',
      }),
      ticket({
        id: '2',
        status: 'assigned',
        category: 'hvac',
        assigned_to: 'tech-a',
        stores: { code: '172', name: 'TA' },
      }),
      ticket({
        id: '3',
        status: 'in_progress',
        category: 'electrical',
        assigned_to: 'tech-a',
        stores: { code: '101', name: 'Shinkin' },
      }),
      ticket({
        id: '4',
        status: 'resolved',
        category: 'hvac',
        assigned_to: 'tech-b',
        stores: { code: '172', name: 'TA' },
      }),
    ]

    const kpis = computeDashboardKpis(
      tickets,
      [{ id: 'tech-a', name: 'Yossi' }],
      now,
    )

    expect(kpis.open).toBe(3)
    expect(kpis.breached).toBe(1)
    expect(kpis.unassigned).toBe(1)
    expect(kpis.byCategory[0]).toMatchObject({ key: 'hvac', count: 2 })
    expect(kpis.topStores[0]).toMatchObject({ code: '172', count: 2 })
    expect(kpis.techLoad[0]).toMatchObject({ id: 'tech-a', name: 'Yossi', count: 2 })
    expect(kpis.exceptions.map((t) => t.id)).toEqual(['1'])
  })
})
