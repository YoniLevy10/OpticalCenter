import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

vi.mock('@/lib/auth/request-actor', () => ({
  requireActor: vi.fn(async () => ({
    id: 'ari-demo',
    email: 'ari@example.com',
    memberships: [{ role: 'global_maintenance', organization_id: 'org' }],
  })),
  authErrorResponse: (err: { status: number; message: string }) =>
    Response.json({ error: err.message }, { status: err.status }),
}))

vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
}))

describe('POST /api/ops/visits — demo non-UUID ids', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    vi.resetModules()
  })

  it('accepts trial-*, il-store-*, vendor-pref-* ids (not zod uuid)', async () => {
    const { memReset, memGet } = await import('@/lib/data/memory-store')
    const { resetOpsLedger, createSpend, applySpendDecision } = await import(
      '@/lib/data/ops-ledger'
    )
    const { memResetVisits } = await import('@/modules/visits/service')
    memReset()
    memResetVisits()
    resetOpsLedger()

    // Trial seeds include HVAC tickets and preferred vendors.
    const ticket = memGet('trial-6006-hvac')
    expect(ticket).toBeTruthy()
    expect(ticket!.store_id.startsWith('il-store-')).toBe(true)

    const spend = createSpend({
      storeId: ticket!.store_id,
      storeCode: ticket!.stores?.code ?? '6006',
      storeName: ticket!.stores?.name ?? 'דמו',
      ticketId: ticket!.id,
      reason: 'שיגור ביקור',
      vendorName: 'קלימה',
      requestedAmount: 100,
      scope: 'ביקור',
      urgent: false,
      actor: 'ארי',
    })
    applySpendDecision(spend.id, 'approved', 'ארי')

    const { POST } = await import('./route')
    const body = {
      storeId: ticket!.store_id,
      ticketIds: [ticket!.id],
      vendorId: 'vendor-pref-hvac-center',
      idempotencyKey: 'demo-non-uuid-visit-1',
    }
    expect(body.storeId).toMatch(/^il-store-/)
    expect(body.ticketIds[0]).toMatch(/^trial-/)
    expect(body.vendorId).toMatch(/^vendor-pref-/)

    const req = new NextRequest('http://localhost/api/ops/visits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBeLessThan(300)
    expect(json.error).toBeUndefined()
    expect(json.visit?.id).toBeTruthy()
    expect(json.visit.items).toHaveLength(1)
    // No webhook on preferred seed → labeled, not fake "sent"
    expect(json.visit.items[0].status).toBe('labeled')
    expect(json.visit.status).toBe('dispatched')
  })

  it('rejects malformed empty ids with clear 400', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/ops/visits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        storeId: '',
        ticketIds: [],
        vendorId: '',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/לא תקינה/)
  })
})
