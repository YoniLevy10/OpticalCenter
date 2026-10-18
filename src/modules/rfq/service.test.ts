import { beforeEach, describe, expect, it } from 'vitest'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

import { memReset } from '@/lib/data/memory-store'
import { addQuoteToDraft, createRfqDraft, listRfqDrafts } from './service'

describe('RFQ service memory path (C07)', () => {
  beforeEach(() => {
    memReset()
  })

  it('stores drafts and lists by ticket without sending', async () => {
    const { draft, backend } = await createRfqDraft({
      trade: 'hvac',
      ticket_ids: ['trial-6001-hvac'],
      store_code: '6001',
      store_name: 'דמו',
      document_notes: ['צילום'],
      timing_note: 'השבוע',
    })
    expect(backend).toBe('memory')
    expect(draft.status).toBe('draft')

    const listed = await listRfqDrafts({ ticketId: 'trial-6001-hvac' })
    expect(listed.drafts.some((d) => d.id === draft.id)).toBe(true)
  })

  it('appends manually captured quotes', async () => {
    const { draft } = await createRfqDraft({
      trade: 'plumbing',
      ticket_ids: ['t-1'],
    })
    const { draft: next } = await addQuoteToDraft(draft.id, {
      source: 'ספק א׳',
      quoted_at: '2026-10-17',
      amount: 500,
      currency: 'ILS',
      vat_included: false,
    })
    expect(next.quotes).toHaveLength(1)
    expect(next.quotes[0]?.amount).toBe(500)
    expect(next.status).toBe('draft')
  })
})
