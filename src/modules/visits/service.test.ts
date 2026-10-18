import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEMO_TECH_ID,
  memCreate,
  memCreateVendor,
  memGetVendor,
  memListDispatches,
  memListVendors,
  memReset,
  memUpdateVendor,
} from '@/lib/data/memory-store'
import {
  createServiceVisit,
  memListVisits,
  memResetVisits,
} from '@/modules/visits/service'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'
import {
  applySpendDecision,
  createSpend,
  resetOpsLedger,
} from '@/lib/data/ops-ledger'
import { dispatchToVendor } from '@/modules/vendors/dispatch'

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

describe('createServiceVisit — C01 reliability', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
    memResetVisits()
    resetOpsLedger()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a visit and labels each ticket when vendor has no webhook', async () => {
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
    // Prefer a general vendor so both categories are suitable
    let vendor = memListVendors(true).find((v) =>
      v.specialties.toLowerCase().includes('general'),
    )
    if (!vendor) {
      vendor = memCreateVendor({
        name: 'ספק כללי',
        specialties: 'general',
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
      idempotencyKey: 'test-visit-labeled-1',
    })

    expect(visit.ticket_ids).toEqual([a.id, b.id])
    expect(visit.dispatch_ids).toHaveLength(2)
    expect(visit.status).toBe('dispatched')
    expect(visit.items.every((i) => i.status === 'labeled')).toBe(true)
    expect(visit.items.every((i) => !i.can_retry)).toBe(true)
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

  it('rejects inactive or unsuitable vendor', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ticket = memCreate({
      store,
      description: 'מזגן',
      priority: 'high',
      category: 'hvac',
    })
    const vendor = memCreateVendor({
      name: 'חשמל בלבד',
      specialties: 'electrical',
    })

    await expect(
      createServiceVisit({
        storeId: store.id,
        ticketIds: [ticket.id],
        vendorId: vendor.id,
      }),
    ).rejects.toThrow(/אינו מתאים/)

    memUpdateVendor(vendor.id, { active: false, specialties: 'hvac' })
    await expect(
      createServiceVisit({
        storeId: store.id,
        ticketIds: [ticket.id],
        vendorId: vendor.id,
      }),
    ).rejects.toThrow(/לא זמין/)
  })

  it('marks visit partial when some tickets lack spend approval', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ok = memCreate({
      store,
      description: 'מזגן מאושר',
      priority: 'high',
      category: 'hvac',
    })
    const blocked = memCreate({
      store,
      description: 'מזגן ללא אישור',
      priority: 'high',
      category: 'hvac',
    })
    const vendor =
      memListVendors(true).find((v) =>
        v.specialties.toLowerCase().includes('hvac'),
      ) ??
      memCreateVendor({ name: 'מיזוג', specialties: 'hvac' })

    approveSpendForTicket({
      ticketId: ok.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })
    // blocked: no spend approval

    const visit = await createServiceVisit({
      storeId: store.id,
      ticketIds: [ok.id, blocked.id],
      vendorId: vendor.id,
      idempotencyKey: 'test-partial-1',
    })

    expect(visit.status).toBe('partial')
    const okItem = visit.items.find((i) => i.ticket_id === ok.id)!
    const blockedItem = visit.items.find((i) => i.ticket_id === blocked.id)!
    expect(okItem.status).toBe('labeled')
    expect(blockedItem.status).toBe('blocked')
    expect(blockedItem.can_retry).toBe(true)
    expect(okItem.can_retry).toBe(false)
  })

  it('is idempotent on double submit with the same client key', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ticket = memCreate({
      store,
      description: 'מזגן',
      priority: 'high',
      category: 'hvac',
    })
    const vendor =
      memListVendors(true).find((v) =>
        v.specialties.toLowerCase().includes('hvac'),
      ) ??
      memCreateVendor({ name: 'מיזוג', specialties: 'hvac' })
    approveSpendForTicket({
      ticketId: ticket.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })

    const key = 'test-idem-double-click'
    const first = await createServiceVisit({
      storeId: store.id,
      ticketIds: [ticket.id],
      vendorId: vendor.id,
      idempotencyKey: key,
    })
    const second = await createServiceVisit({
      storeId: store.id,
      ticketIds: [ticket.id],
      vendorId: vendor.id,
      idempotencyKey: key,
    })

    expect(second.id).toBe(first.id)
    expect(memListVisits()).toHaveLength(1)
    expect(
      memListDispatches().filter((d) =>
        d.idempotency_key.startsWith(`visit:${first.id}:`),
      ),
    ).toHaveLength(1)
  })

  it('retries only failed/blocked tickets on retryFailedOnly', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ok = memCreate({
      store,
      description: 'מאושר',
      priority: 'high',
      category: 'hvac',
    })
    const later = memCreate({
      store,
      description: 'יקבל אישור אחר כך',
      priority: 'high',
      category: 'hvac',
    })
    const vendor =
      memListVendors(true).find((v) =>
        v.specialties.toLowerCase().includes('hvac'),
      ) ??
      memCreateVendor({ name: 'מיזוג', specialties: 'hvac' })

    approveSpendForTicket({
      ticketId: ok.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })

    const key = 'test-retry-failed'
    const first = await createServiceVisit({
      storeId: store.id,
      ticketIds: [ok.id, later.id],
      vendorId: vendor.id,
      idempotencyKey: key,
    })
    expect(first.status).toBe('partial')
    const firstOk = first.items.find((i) => i.ticket_id === ok.id)!
    expect(firstOk.status).toBe('labeled')
    expect(firstOk.dispatch_id).toBeTruthy()

    approveSpendForTicket({
      ticketId: later.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })

    const retried = await createServiceVisit({
      storeId: store.id,
      ticketIds: [ok.id, later.id],
      vendorId: vendor.id,
      idempotencyKey: key,
      retryFailedOnly: true,
    })

    expect(retried.id).toBe(first.id)
    expect(retried.status).toBe('dispatched')
    expect(retried.items.every((i) => i.status === 'labeled')).toBe(true)
    // Successful dispatch id unchanged
    expect(retried.items.find((i) => i.ticket_id === ok.id)?.dispatch_id).toBe(
      firstOk.dispatch_id,
    )
  })
})

describe('dispatchToVendor — channel honesty', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
    resetOpsLedger()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses labeled when no webhook (never sent)', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ticket = memCreate({
      store,
      description: 'בדיקה',
      priority: 'medium',
      category: 'other',
    })
    const vendor = memCreateVendor({
      name: 'בלי וובהוק',
      specialties: 'general',
      webhook_url: null,
    })
    approveSpendForTicket({
      ticketId: ticket.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })

    const row = await dispatchToVendor({
      ticketId: ticket.id,
      vendorId: vendor.id,
      idempotencyKey: 'no-webhook-1',
    })
    expect(row.status).toBe('labeled')
  })

  it('uses sent only when webhook returns ok', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ticket = memCreate({
      store,
      description: 'בדיקה',
      priority: 'medium',
      category: 'other',
    })
    const vendor = memCreateVendor({
      name: 'עם וובהוק',
      specialties: 'general',
      webhook_url: 'https://partner.example/hook',
    })
    approveSpendForTicket({
      ticketId: ticket.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('ok', { status: 200 })),
    )

    const row = await dispatchToVendor({
      ticketId: ticket.id,
      vendorId: vendor.id,
      idempotencyKey: 'webhook-ok-1',
    })
    expect(row.status).toBe('sent')
  })

  it('marks failed when webhook errors and allows retryFailed redrive', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ticket = memCreate({
      store,
      description: 'בדיקה',
      priority: 'medium',
      category: 'other',
    })
    const vendor = memCreateVendor({
      name: 'וובהוק כושל',
      specialties: 'general',
      webhook_url: 'https://partner.example/hook',
    })
    approveSpendForTicket({
      ticketId: ticket.id,
      storeId: store.id,
      storeCode: store.code,
      vendorName: vendor.name,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    )

    const failed = await dispatchToVendor({
      ticketId: ticket.id,
      vendorId: vendor.id,
      idempotencyKey: 'webhook-fail-1',
    })
    expect(failed.status).toBe('failed')
    expect(failed.last_error).toMatch(/500/)

    // Without retryFailed, same key returns failed row
    const again = await dispatchToVendor({
      ticketId: ticket.id,
      vendorId: vendor.id,
      idempotencyKey: 'webhook-fail-1',
    })
    expect(again.id).toBe(failed.id)
    expect(again.status).toBe('failed')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('ok', { status: 200 })),
    )
    const recovered = await dispatchToVendor({
      ticketId: ticket.id,
      vendorId: vendor.id,
      idempotencyKey: 'webhook-fail-1',
      retryFailed: true,
    })
    expect(recovered.id).toBe(failed.id)
    expect(recovered.status).toBe('sent')
  })

  it('keeps spend gate on dispatch', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6018')!
    const ticket = memCreate({
      store,
      description: 'בלי אישור',
      priority: 'low',
      category: 'other',
    })
    const vendor = memCreateVendor({
      name: 'ספק',
      specialties: 'general',
    })
    await expect(
      dispatchToVendor({
        ticketId: ticket.id,
        vendorId: vendor.id,
        idempotencyKey: 'spend-block-1',
      }),
    ).rejects.toThrow(/אישור/)
    void memGetVendor(vendor.id)
  })
})
