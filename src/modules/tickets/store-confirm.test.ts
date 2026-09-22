import { describe, expect, it, beforeEach } from 'vitest'
import { memReset, memCreate, DEMO_TECH_ID } from '@/lib/data/memory-store'
import { updateStatus } from '@/modules/tickets/service'
import { confirmStoreFix } from './store-confirm'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'

describe('store confirm close', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('closes a resolved ticket after store confirmation', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '172')!
    const created = memCreate({
      store,
      description: 'מזגן לא מקרר',
      priority: 'high',
      category: 'hvac',
      status: 'assigned',
      assigned_to: DEMO_TECH_ID,
    })
    await updateStatus(created.id, 'in_progress')
    await updateStatus(created.id, 'resolved')

    const result = await confirmStoreFix({
      ticketId: created.id,
      actorLabel: 'מנהל חנות',
    })
    expect(result.status).toBe('closed')
    expect(result.store_confirmed_at).toBeTruthy()
  })

  it('rejects confirm when ticket is still in progress', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '130')!
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
