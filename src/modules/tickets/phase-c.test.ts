import { beforeEach, describe, expect, it } from 'vitest'
import { createTicket, listTickets } from '@/modules/tickets/service'
import { memReset } from '@/lib/data/memory-store'
import { dispatchToVendor } from '@/modules/vendors/dispatch'
import { memListVendors } from '@/lib/data/memory-store'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

describe('Phase C — server listTickets filters', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('filters by q and priority on the service layer', async () => {
    await createTicket({
      storeCode: '172',
      description: 'מזגן לא עובד באולם',
      priority: 'critical',
      source: 'demo',
    })
    await createTicket({
      storeCode: '172',
      description: 'נורה שרופה',
      priority: 'low',
      source: 'demo',
    })

    const byQ = await listTickets({ limit: 50, q: 'מזגן' })
    expect(byQ.tickets).toHaveLength(1)
    expect(byQ.tickets[0]?.description).toContain('מזגן')

    const byPri = await listTickets({ limit: 50, priority: 'low' })
    expect(byPri.tickets.every((t) => t.priority === 'low')).toBe(true)
    expect(byPri.tickets.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Phase C — partner dispatch', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('is idempotent and attaches HMAC', async () => {
    const ticket = await createTicket({
      storeCode: '172',
      description: 'קריאה לספק חיצוני',
      priority: 'high',
      source: 'demo',
    })
    const vendor = memListVendors(true)[0]
    expect(vendor).toBeTruthy()

    const key = `test-${ticket.id}-${vendor!.id}`
    const a = await dispatchToVendor({
      ticketId: ticket.id,
      vendorId: vendor!.id,
      idempotencyKey: key,
    })
    const b = await dispatchToVendor({
      ticketId: ticket.id,
      vendorId: vendor!.id,
      idempotencyKey: key,
    })
    expect(a.id).toBe(b.id)
    expect(a.request_hmac).toMatch(/^[a-f0-9]{64}$/)
    expect(a.status).toBe('sent')
  })
})
