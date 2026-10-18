import { describe, expect, it, beforeEach } from 'vitest'
import {
  memReset,
  memCreate,
  memAddMessage,
  memGet,
  DEMO_TECH_ID,
} from '@/lib/data/memory-store'
import { updateStatus } from '@/modules/tickets/service'
import { confirmStoreFix } from './store-confirm'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'

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

describe('store confirm close', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('stamps confirm but holds final close during quality window', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6006')!
    const created = memCreate({
      store,
      description: 'מזגן לא מקרר',
      priority: 'high',
      category: 'hvac',
      status: 'assigned',
      assigned_to: DEMO_TECH_ID,
    })
    await updateStatus(created.id, 'in_progress')
    attachPair(created.id)
    await updateStatus(created.id, 'resolved')

    const result = await confirmStoreFix({
      ticketId: created.id,
      actorLabel: 'מנהל חנות',
    })
    expect(result.status).toBe('resolved')
    expect(result.pending_final_close).toBe(true)
    expect(result.store_confirmed_at).toBeTruthy()
    expect(memGet(created.id)?.status).toBe('resolved')
  })

  it('closes after quality hold has ended', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6006')!
    const created = memCreate({
      store,
      description: 'hold הסתיים',
      priority: 'medium',
      category: 'hvac',
      status: 'assigned',
      assigned_to: DEMO_TECH_ID,
    })
    await updateStatus(created.id, 'in_progress')
    attachPair(created.id)
    await updateStatus(created.id, 'resolved')
    const mem = memGet(created.id)!
    mem.quality_hold_until = new Date(Date.now() - 1000).toISOString()

    const result = await confirmStoreFix({
      ticketId: created.id,
      actorLabel: 'מנהל חנות',
    })
    expect(result.status).toBe('closed')
    expect(result.store_confirmed_at).toBeTruthy()
  })

  it('rejects confirm when ticket is still in progress', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6029')!
    const created = memCreate({
      store,
      description: 'קצר חשמלי',
      priority: 'critical',
      category: 'electrical',
      status: 'in_progress',
      assigned_to: DEMO_TECH_ID,
    })
    await expect(
      confirmStoreFix({ ticketId: created.id, actorLabel: 'store' }),
    ).rejects.toThrow(/נפתרה/)
  })
})
