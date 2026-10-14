import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEMO_TECH_ID,
  memCreate,
  memCreateVendor,
  memListVendors,
  memReset,
} from '@/lib/data/memory-store'
import { createServiceVisit, memListVisits } from '@/modules/visits/service'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'
import {
  applySpendDecision,
  createSpend,
  resetOpsLedger,
} from '@/lib/data/ops-ledger'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

function approveSpendForTicket(input: {
  ticketId: string
  storeId: string
  storeCode: string
  vendorName: string
}) {
  const spend = createSpend({
    storeId: input.storeId,
    storeCode: input.storeCode,
    storeName: 'בדיקה',
    ticketId: input.ticketId,
    reason: 'שיגור ביקור',
    vendorName: input.vendorName,
    requestedAmount: 100,
    scope: 'ביקור',
    urgent: false,
    actor: 'ארי',
  })
  applySpendDecision(spend.id, 'approved', 'ארי')
}

describe('createServiceVisit', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
    resetOpsLedger()
  })

  it('creates a visit and dispatches each ticket under one visit id', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const a = memCreate({
      store,
      description: 'מזגן',
      priority: 'high',
      category: 'hvac',
      status: 'assigned',
      assigned_to: DEMO_TECH_ID,
    })
    const b = memCreate({
      store,
      description: 'ברז',
      priority: 'medium',
      category: 'plumbing',
      status: 'new',
    })
    let vendor = memListVendors(true)[0]
    if (!vendor) {
      vendor = memCreateVendor({
        name: 'ספק בדיקה',
        specialties: 'hvac',
      })
    }

    approveSpendForTicket({
      ticketId: a.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })
    approveSpendForTicket({
      ticketId: b.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })

    const visit = await createServiceVisit({
      storeId: store.id,
      ticketIds: [a.id, b.id],
      vendorId: vendor.id,
      actorId: 'ari-1',
      notes: 'ביקור בוקר',
    })

    expect(visit.ticket_ids).toEqual([a.id, b.id])
    expect(visit.dispatch_ids).toHaveLength(2)
    expect(visit.status).toBe('dispatched')
    expect(memListVisits().some((v) => v.id === visit.id)).toBe(true)
  })

  it('rejects tickets from different stores', async () => {
    const s1 = israelStoresAsRows().find((s) => s.code === '6018')!
    const s2 = israelStoresAsRows().find((s) => s.code === '6006')!
    const a = memCreate({
      store: s1,
      description: 'א',
      priority: 'low',
      category: 'other',
    })
    const b = memCreate({
      store: s2,
      description: 'ב',
      priority: 'low',
      category: 'other',
    })
    let vendor = memListVendors(true)[0]
    if (!vendor) {
      vendor = memCreateVendor({
        name: 'ספק',
        specialties: 'general',
      })
    }

    await expect(
      createServiceVisit({
        storeId: s1.id,
        ticketIds: [a.id, b.id],
        vendorId: vendor.id,
      }),
    ).rejects.toThrow(/אותה חנות/)
  })
})
