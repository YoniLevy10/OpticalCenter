import { beforeEach, describe, expect, it } from 'vitest'
import { internalLiveCursor } from '@/lib/data/live-cursor'
import { memCreate, memReset, memUpdateStatus } from '@/lib/data/memory-store'
import { applySpendDecision, createSpend, resetOpsLedger } from '@/lib/data/ops-ledger'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'

describe('internal server live cursor', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
    resetOpsLedger()
  })

  it('changes when a ticket status changes', () => {
    const store = israelStoresAsRows().find((row) => row.code === '6006')!
    const before = internalLiveCursor()
    const ticket = memCreate({
      store,
      description: 'מזגן לא מקרר',
      priority: 'high',
      category: 'hvac',
    })
    expect(internalLiveCursor()).not.toBe(before)
    const opened = internalLiveCursor()
    memUpdateStatus(ticket.id, 'in_progress')
    expect(internalLiveCursor()).not.toBe(opened)
  })

  it('changes when a spend is decided', () => {
    const before = internalLiveCursor()
    const spend = createSpend({
      actor: 'ארי',
      storeId: 'store-6006',
      storeCode: '6006',
      storeName: 'אבן גבירול',
      ticketId: null,
      reason: 'מילוי גז',
      vendorName: 'קירור',
      requestedAmount: 400,
      scope: 'local',
      urgent: false,
    })
    expect(internalLiveCursor()).not.toBe(before)
    const pending = internalLiveCursor()
    applySpendDecision(spend.id, 'approved', 'ארי')
    expect(internalLiveCursor()).not.toBe(pending)
  })

  it('stays put across repeated reads', () => {
    const first = internalLiveCursor()
    expect(internalLiveCursor()).toBe(first)
  })
})
