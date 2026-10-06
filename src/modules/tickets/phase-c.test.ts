import { beforeEach, describe, expect, it } from 'vitest'
import { createTicket, listTickets } from '@/modules/tickets/service'
import { memReset } from '@/lib/data/memory-store'
import { dispatchToVendor } from '@/modules/vendors/dispatch'
import { memListVendors } from '@/lib/data/memory-store'
import { applySpendDecision, createSpend, resetOpsLedger } from '@/lib/data/ops-ledger'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

describe('Phase C — server listTickets filters', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('filters by q and priority on the service layer', async () => {
    // Unique token — trial seeds also contain «מזגן» and would collide on q.
    const uniqueQ = 'פילטר-phase-c-מזגן-ייחודי'
    await createTicket({
      storeCode: '172',
      description: `${uniqueQ} לא עובד באולם`,
      priority: 'critical',
      source: 'demo',
    })
    await createTicket({
      storeCode: '172',
      description: 'נורה שרופה',
      priority: 'low',
      source: 'demo',
    })

    const byQ = await listTickets({ limit: 50, q: uniqueQ })
    expect(byQ.tickets).toHaveLength(1)
    expect(byQ.tickets[0]?.description).toContain(uniqueQ)

    const byPri = await listTickets({ limit: 50, priority: 'low' })
    expect(byPri.tickets.every((t) => t.priority === 'low')).toBe(true)
    expect(byPri.tickets.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Phase C — partner dispatch', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
    resetOpsLedger()
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

    const spend = createSpend({
      storeId: ticket.store_id,
      storeCode: '172',
      storeName: 'תל אביב',
      ticketId: ticket.id,
      reason: 'שיגור ספק',
      vendorName: vendor!.name,
      requestedAmount: 100,
      scope: 'ביקור',
      urgent: false,
      actor: 'ארי',
    })
    applySpendDecision(spend.id, 'approved', 'ארי')

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
