import { describe, expect, it } from 'vitest'
import { ariGreeting, buildAriHome, ARI_HOME_STORE_CAP } from './ari-home'
import type { QueueTicket } from '@/modules/tickets/queue'

const NOW = new Date('2026-08-16T12:00:00.000Z')

function ticket(
  partial: Partial<QueueTicket> & Pick<QueueTicket, 'id'>,
): QueueTicket {
  return {
    status: 'in_progress',
    priority: 'medium',
    description: 'test',
    created_at: '2026-08-15T10:00:00.000Z',
    assigned_to: 'tech-a',
    ...partial,
  }
}

describe('ariGreeting', () => {
  it('says good morning during the Israel day and good night after 19:00', () => {
    expect(ariGreeting(new Date('2026-10-31T10:00:00+02:00'))).toBe('בוקר טוב ארי')
    expect(ariGreeting(new Date('2026-10-31T18:30:00+02:00'))).toBe('בוקר טוב ארי')
    expect(ariGreeting(new Date('2026-10-31T19:00:00+02:00'))).toBe('לילה טוב ארי')
    expect(ariGreeting(new Date('2026-10-31T02:00:00+02:00'))).toBe('לילה טוב ארי')
  })
})

describe('buildAriHome', () => {
  it('counts open faults and those closed today in Israel', () => {
    const home = buildAriHome({
      openCount: 1,
      now: NOW,
      openTickets: [
        ticket({
          id: 'open-1',
          store_id: 's1',
          stores: { code: '6001', name: 'דיזנגוף' },
        }),
      ],
      closedTickets: [
        ticket({
          id: 'done-today',
          status: 'closed',
          resolved_at: '2026-08-16T06:00:00.000Z',
          stores: { code: '6002', name: 'שקט' },
        }),
        ticket({
          id: 'done-yesterday',
          status: 'closed',
          resolved_at: '2026-08-15T06:00:00.000Z',
          stores: { code: '6003', name: 'אתמול' },
        }),
        ticket({
          id: 'done-missing',
          status: 'resolved',
          resolved_at: null,
          stores: { code: '6004', name: 'בלי זמן' },
        }),
      ],
    })

    expect(home.open).toBe(1)
    expect(home.closedToday).toBe(1)
    expect(home.stores.map((store) => store.name)).toEqual(['דיזנגוף'])
  })

  it('groups one store by category and hides a quiet store', () => {
    const home = buildAriHome({
      openCount: 2,
      now: NOW,
      openTickets: [
        ticket({
          id: 'a',
          store_id: 'haifa',
          category: 'security',
          title: 'מצלמה כבויה',
          stores: { code: '6037', name: 'חיפה הרצל' },
        }),
        ticket({
          id: 'b',
          store_id: 'haifa',
          category: 'hvac',
          title: 'מזגן לא מקרר',
          stores: { code: '6037', name: 'חיפה הרצל' },
        }),
      ],
      closedTickets: [
        ticket({
          id: 'quiet',
          status: 'closed',
          resolved_at: '2026-08-16T08:00:00.000Z',
          store_id: 'quiet',
          stores: { code: '6010', name: 'שקט לגמרי' },
        }),
      ],
    })

    expect(home.stores).toHaveLength(1)
    expect(home.stores[0]?.categories.map((category) => category.label).sort()).toEqual(
      ['אבטחה', 'מיזוג'],
    )
    expect(home.stores[0]?.categories.flatMap((category) => category.rows.map((row) => row.problem))).toEqual(
      expect.arrayContaining(['מצלמה כבויה', 'מזגן לא מקרר']),
    )
  })

  it('sorts a breached store ahead of routine work and caps the rest', () => {
    const openTickets = [
      ticket({
        id: 'late',
        store_id: 'late-store',
        priority: 'high',
        assigned_to: null,
        sla_respond_by: '2026-08-16T08:00:00.000Z',
        stores: { code: '6099', name: 'באיחור' },
      }),
      ...Array.from({ length: ARI_HOME_STORE_CAP }, (_, index) =>
        ticket({
          id: `calm-${index}`,
          store_id: `calm-${index}`,
          stores: { code: String(6100 + index), name: `רגיל ${index}` },
        }),
      ),
    ]

    const home = buildAriHome({
      openCount: openTickets.length,
      now: NOW,
      openTickets,
      closedTickets: [],
    })

    expect(home.stores[0]?.name).toBe('באיחור')
    expect(home.stores[0]?.categories[0]?.urgent).toBe(true)
    expect(home.stores[0]?.categories[0]?.advice).toContain('לאשר')
    expect(home.stores).toHaveLength(ARI_HOME_STORE_CAP)
    expect(home.moreStores).toBe(1)
  })

  it('adds a prevention line only after a real repeat', () => {
    const store = { code: '6037', name: 'חיפה הרצל' }
    const repeat = (id: string, status = 'closed') =>
      ticket({
        id,
        status,
        store_id: 'haifa',
        category: 'security',
        description: 'מצלמה',
        created_at: '2026-07-01T10:00:00.000Z',
        resolved_at: status === 'closed' ? '2026-07-02T10:00:00.000Z' : null,
        stores: store,
      })

    const withRepeat = buildAriHome({
      openCount: 1,
      now: NOW,
      openTickets: [
        ticket({
          id: 'now',
          store_id: 'haifa',
          category: 'security',
          title: 'מצלמה שוב',
          stores: store,
        }),
      ],
      closedTickets: [repeat('h1'), repeat('h2'), repeat('h3')],
    })
    const once = buildAriHome({
      openCount: 1,
      now: NOW,
      openTickets: [
        ticket({
          id: 'now',
          store_id: 'haifa',
          category: 'security',
          title: 'מצלמה',
          stores: store,
        }),
      ],
      closedTickets: [repeat('h1')],
    })

    expect(withRepeat.stores[0]?.categories[0]?.prevention).toMatch(/בדיקה מונעת/)
    expect(once.stores[0]?.categories[0]?.prevention).toBeNull()
  })
})
