import { beforeAll, describe, expect, it } from 'vitest'
import { assign, createTicket, listTickets, updateStatus } from '@/modules/tickets/service'
import { DEMO_STORES } from '@/modules/stores/data'
import { DEMO_TECH_ID } from '@/lib/data/memory-store'
import type { TicketPriority } from '@/modules/tickets/constants'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

const DESCS = [
  'המזגן לא מקרר באזור הקופות',
  'נורה שרופה במחסן',
  'נזילת מים מהתקרה',
  'ידית הדלת רופפת',
  'מסוף אשראי לא מגיב',
  'ריח חריף ליד השירותים',
  'תריס חיצוני תקוע',
  'מדף שבור באולם התצוגה',
]

describe('Search dataset seed (≥50 tickets)', () => {
  beforeAll(async () => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    for (let i = 0; i < 50; i++) {
      const store = DEMO_STORES[i % DEMO_STORES.length]
      const priorities: TicketPriority[] = ['critical', 'high', 'medium', 'low']
      const t = await createTicket({
        storeCode: store.code,
        description: `${DESCS[i % DESCS.length]} (#seed-${i + 1})`,
        category: 'other',
        priority: priorities[i % priorities.length],
        source: 'demo',
        reporterPhone: `9725000${String(i).padStart(4, '0')}`,
      })
      if (i % 11 === 0) {
        await assign(t.id, DEMO_TECH_ID)
        await updateStatus(t.id, 'in_progress')
        await updateStatus(t.id, 'resolved')
      } else if (i % 7 === 0) {
        await assign(t.id, DEMO_TECH_ID)
        await updateStatus(t.id, 'in_progress')
      } else if (i % 5 === 1) {
        await assign(t.id, DEMO_TECH_ID)
      }
    }
  }, 60_000)

  it('lists at least 50 tickets (within cap)', async () => {
    const { tickets } = await listTickets(100)
    expect(tickets.length).toBeGreaterThanOrEqual(50)
  })

  it('can find seeded description substring', async () => {
    const { tickets } = await listTickets(100)
    const hit = tickets.filter((t) => t.description.includes('#seed-'))
    expect(hit.length).toBeGreaterThanOrEqual(50)
  })

  it('has mixed statuses after seed walks', async () => {
    const { tickets } = await listTickets(100)
    const statuses = new Set(tickets.map((t) => t.status))
    expect(statuses.has('new') || statuses.has('assigned')).toBe(true)
    expect(statuses.size).toBeGreaterThan(1)
  })
})
