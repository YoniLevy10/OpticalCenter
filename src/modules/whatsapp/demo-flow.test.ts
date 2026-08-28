import { beforeEach, describe, expect, it } from 'vitest'
import { processInboundMessage } from '@/modules/whatsapp/intake'
import type { InboundMessage } from '@/modules/whatsapp/types'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

function msg(partial: Partial<InboundMessage> & Pick<InboundMessage, 'text'>): InboundMessage {
  return {
    messageId: `m_${Math.random().toString(36).slice(2)}`,
    waId: '972501234567',
    phoneNumberId: null,
    text: partial.text,
    mediaUrl: partial.mediaUrl ?? null,
    mediaKind: partial.mediaKind ?? null,
    timestamp: null,
    sourceHint: partial.sourceHint ?? 'demo',
  }
}

describe('E2E demo flow (memory)', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
  })

  it('STORE_172 → HVAC description → ticket confirmation', async () => {
    const a = await processInboundMessage(msg({ text: 'STORE_172' }), {
      skipOutboundGraph: true,
    })
    expect(a.ok).toBe(true)
    expect(a.state).toBe('awaiting_description')
    expect(a.reply).toMatch(/אבן גבירול|172/)

    const b = await processInboundMessage(
      msg({ text: 'המזגן הראשי לא עובד ויש ממנו נזילה' }),
      { skipOutboundGraph: true },
    )
    expect(b.ok).toBe(true)
    expect(b.ticketId).toBeTruthy()
    expect(b.displayNumber || b.reply).toBeTruthy()
    expect(b.reply).toMatch(/OC-|פתחתי תקלה|הדיווח התקבל/)
    expect(b.reply).toMatch(/גבוה|עדיפות/)
  })
})
