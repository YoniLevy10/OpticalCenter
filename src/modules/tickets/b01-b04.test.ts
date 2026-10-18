import { beforeEach, describe, expect, it } from 'vitest'
import {
  memReset,
  memCreate,
  memAddMessage,
  memGet,
  DEMO_TECH_ID,
} from '@/lib/data/memory-store'
import {
  createSpend,
  applySpendDecision,
  recordActualSpend,
  spendsForTicket,
  spendsForAsset,
  resetOpsLedger,
} from '@/lib/data/ops-ledger'
import { sumTrueCost, trueCostBreakdown } from '@/modules/spend/true-cost'
import { updateStatus, setRepairEta } from '@/modules/tickets/service'
import { confirmStoreFix } from '@/modules/tickets/store-confirm'
import {
  isQualityHoldActive,
  qualityHoldUntilFrom,
  QUALITY_HOLD_BLOCK_CLOSE_HE,
} from '@/modules/tickets/quality-hold'
import { formatRepairEtaHe } from '@/modules/tickets/repair-eta'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

const store = () => israelStoresAsRows().find((s) => s.code === '6018')!
const ASSET_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

function attachPair(ticketId: string) {
  memAddMessage(ticketId, {
    channel: 'tech',
    direction: 'inbound',
    body: 'before',
    media_url: 'https://cdn.example/before.jpg',
    proof_role: 'before',
  })
  memAddMessage(ticketId, {
    channel: 'tech',
    direction: 'inbound',
    body: 'after',
    media_url: 'https://cdn.example/after.jpg',
    proof_role: 'after',
  })
}

describe('B01 true cost', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
    resetOpsLedger()
  })

  it('rolls up spend linked to ticket and asset', () => {
    const ticket = memCreate({
      store: store(),
      description: 'מדחס',
      priority: 'high',
      category: 'hvac',
      assetId: ASSET_ID,
    })
    expect(memGet(ticket.id)?.asset_id).toBe(ASSET_ID)

    const spend = createSpend({
      storeId: ticket.store_id,
      storeCode: '6018',
      storeName: 'דיזנגוף',
      ticketId: ticket.id,
      assetId: ASSET_ID,
      reason: 'החלפת מדחס',
      vendorName: 'קירור בע״מ',
      requestedAmount: 1200,
      scope: 'parts',
      urgent: true,
      actor: 'מנהל',
    })
    applySpendDecision(spend.id, 'approved', 'ari', 1100)
    recordActualSpend(spend.id, 1150, 'ari')

    expect(sumTrueCost(spendsForTicket(ticket.id))).toBe(1150)
    expect(sumTrueCost(spendsForAsset(ASSET_ID))).toBe(1150)
    expect(trueCostBreakdown(spendsForTicket(ticket.id)).paid).toBe(1150)
  })
})

describe('B03 quality hold', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('starts 30-day hold on resolve and blocks early close', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'נזילה',
      priority: 'medium',
      category: 'plumbing',
      status: 'in_progress',
      assigned_to: DEMO_TECH_ID,
    })
    attachPair(ticket.id)
    const resolved = await updateStatus(ticket.id, 'resolved', DEMO_TECH_ID)
    expect(resolved.status).toBe('resolved')
    expect(resolved.quality_hold_until).toBeTruthy()
    expect(isQualityHoldActive(resolved.quality_hold_until)).toBe(true)

    const confirmed = await confirmStoreFix({
      ticketId: ticket.id,
      actorLabel: 'מנהל חנות',
    })
    expect(confirmed.pending_final_close).toBe(true)
    expect(confirmed.status).toBe('resolved')
    expect(memGet(ticket.id)?.status).toBe('resolved')
    expect(memGet(ticket.id)?.store_confirmed_at).toBeTruthy()

    await expect(updateStatus(ticket.id, 'closed', 'hq-1')).rejects.toThrow(
      QUALITY_HOLD_BLOCK_CLOSE_HE,
    )
  })

  it('allows Ari override of quality hold with reason', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'חריגת hold',
      priority: 'high',
      category: 'hvac',
      status: 'in_progress',
    })
    attachPair(ticket.id)
    await updateStatus(ticket.id, 'resolved', 'tech-1')
    const closed = await updateStatus(ticket.id, 'closed', 'ari-1', {
      actorRoles: ['global_maintenance'],
      qualityHoldOverride: true,
      overrideReason: 'סגירה מוקדמת — ציוד הוחלף',
    })
    expect(closed.status).toBe('closed')
  })

  it('closes after hold expires', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'אחרי hold',
      priority: 'low',
      category: 'other',
      status: 'in_progress',
    })
    attachPair(ticket.id)
    await updateStatus(ticket.id, 'resolved', 'tech-1')
    const mem = memGet(ticket.id)!
    mem.quality_hold_until = new Date(Date.now() - 60_000).toISOString()
    const confirmed = await confirmStoreFix({
      ticketId: ticket.id,
      actorLabel: 'חנות',
    })
    expect(confirmed.status).toBe('closed')
    expect(confirmed.pending_final_close).toBeFalsy()
  })

  it('computes hold end +30 days', () => {
    const start = new Date('2026-01-01T00:00:00.000Z')
    const until = qualityHoldUntilFrom(start)
    expect(until.toISOString()).toBe('2026-01-31T00:00:00.000Z')
  })
})

describe('B04 repair ETA', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('sets and formats repair ETA', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'ETA',
      priority: 'medium',
      category: 'electrical',
    })
    const eta = new Date()
    eta.setHours(eta.getHours() + 3, 0, 0, 0)
    const updated = await setRepairEta(ticket.id, eta.toISOString(), 'hq-1')
    expect(updated.repair_eta_at).toBeTruthy()
    expect(formatRepairEtaHe(updated.repair_eta_at)).toMatch(/היום|·/)
    expect(memGet(ticket.id)?.events.some((e) => e.event_type === 'repair_eta_set')).toBe(
      true,
    )
  })
})
