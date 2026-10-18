import { beforeEach, describe, expect, it } from 'vitest'
import {
  memReset,
  memCreate,
  memAddMessage,
  memGet,
  DEMO_TECH_ID,
} from '@/lib/data/memory-store'
import { updateStatus } from '@/modules/tickets/service'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'
import { rejectStoreFix } from './store-confirm'

describe('rejectStoreFix', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('reopens resolved → in_progress and keeps prior events', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6006')!
    const created = memCreate({
      store,
      description: 'נזילה',
      priority: 'high',
      category: 'plumbing',
      status: 'assigned',
      assigned_to: DEMO_TECH_ID,
      reporterPhone: '972501112233',
    })
    await updateStatus(created.id, 'in_progress')
    memAddMessage(created.id, {
      channel: 'tech',
      direction: 'inbound',
      body: 'before',
      media_url: 'https://cdn.example/before.jpg',
      proof_role: 'before',
    })
    memAddMessage(created.id, {
      channel: 'tech',
      direction: 'inbound',
      body: 'after',
      media_url: 'https://cdn.example/after.jpg',
      proof_role: 'after',
    })
    await updateStatus(created.id, 'resolved')
    const before = memGet(created.id)!
    const eventCount = before.events.length
    const messageCount = before.messages.length

    const result = await rejectStoreFix({
      ticketId: created.id,
      actorLabel: 'wa:972501112233',
      reason: 'לא נפתר — עדיין מטפטף',
    })

    expect(result.status).toBe('in_progress')
    const after = memGet(created.id)!
    expect(after.status).toBe('in_progress')
    expect(after.resolved_at).toBeFalsy()
    expect(after.events.length).toBeGreaterThan(eventCount)
    expect(after.messages.length).toBe(messageCount)
    expect(
      after.events.some(
        (e) =>
          e.event_type === 'store_rejected' &&
          (e.payload as { reason?: string }).reason?.includes('מטפטף'),
      ),
    ).toBe(true)
    expect(
      after.events.some(
        (e) =>
          e.event_type === 'status_changed' &&
          (e.payload as { from?: string; to?: string }).from === 'resolved' &&
          (e.payload as { to?: string }).to === 'in_progress',
      ),
    ).toBe(true)
  })
})
