import { describe, expect, it } from 'vitest'
import { memUpsertSession, MEM_COUNTRY_ID } from '@/lib/data/memory-store'
import { notifyManagerInWindow, sessionWindowOpen } from './window-reply'

describe('manager reply window', () => {
  it('treats a day-old chat as closed', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    expect(sessionWindowOpen(yesterday)).toBe(false)
    expect(sessionWindowOpen(new Date().toISOString())).toBe(true)
  })

  it('holds the decision instead of sending a template when the window is closed', async () => {
    memUpsertSession({
      wa_id: '972501112233',
      country_id: MEM_COUNTRY_ID,
      store_id: null,
      store_code: '172',
      state: 'done',
      pending_description: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      draft_payload: null,
    })
    const result = await notifyManagerInWindow('972501112233', 'ההוצאה אושרה.')
    expect(result).toBe('held')
  })
})
