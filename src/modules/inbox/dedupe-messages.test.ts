import { describe, expect, it } from 'vitest'
import { dedupeThreadMessages } from './dedupe-messages'

describe('dedupeThreadMessages', () => {
  it('collapses ops reply mirrored in inbox + ticket_messages', () => {
    const messages = dedupeThreadMessages([
      {
        id: 'inbox-1',
        direction: 'outbound' as const,
        body: 'לילה טוב תודה רבה',
        created_at: '2026-08-31T00:00:14.000Z',
        ticket_id: 't1',
      },
      {
        id: 'ticket-1',
        direction: 'outbound' as const,
        body: 'לילה טוב תודה רבה',
        created_at: '2026-08-31T00:00:15.000Z',
        ticket_id: 't1',
      },
    ])
    expect(messages).toHaveLength(1)
    expect(messages[0]?.id).toBe('inbox-1')
  })

  it('keeps distinct messages with same body far apart', () => {
    const messages = dedupeThreadMessages([
      {
        id: 'a',
        direction: 'outbound' as const,
        body: 'שלום',
        created_at: '2026-08-31T00:00:00.000Z',
      },
      {
        id: 'b',
        direction: 'outbound' as const,
        body: 'שלום',
        created_at: '2026-08-31T01:00:00.000Z',
      },
    ])
    expect(messages).toHaveLength(2)
  })

  it('keeps inbound and outbound with same text', () => {
    const messages = dedupeThreadMessages([
      {
        id: 'in',
        direction: 'inbound' as const,
        body: 'תודה',
        created_at: '2026-08-31T00:00:00.000Z',
      },
      {
        id: 'out',
        direction: 'outbound' as const,
        body: 'תודה',
        created_at: '2026-08-31T00:00:01.000Z',
      },
    ])
    expect(messages).toHaveLength(2)
  })
})
