import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processInboundMessage } from '@/modules/whatsapp/intake'
import type { InboundMessage } from '@/modules/whatsapp/types'
import { memGet, memListTickets } from '@/lib/data/memory-store'
import { resetOpsLedger } from '@/lib/data/ops-ledger'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

vi.mock('@/modules/whatsapp/voice', () => ({
  transcribeVoice: vi.fn(async () => ({
    text: 'המזגן באולם לא מקרר',
    status: 'transcribed' as const,
    reason: null,
  })),
}))

const dry = { skipOutboundGraph: true as const }

function msg(partial: Partial<InboundMessage> & { text?: string | null }): InboundMessage {
  return {
    messageId: partial.messageId ?? `m_${Math.random().toString(36).slice(2)}`,
    waId: partial.waId ?? '972501222222',
    phoneNumberId: null,
    text: partial.text ?? null,
    mediaUrl: partial.mediaUrl ?? null,
    mediaKind: partial.mediaKind ?? null,
    fileName: partial.fileName ?? null,
    timestamp: '1',
    sourceHint: 'demo',
  }
}

describe('WhatsApp voice happy path', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    resetOpsLedger()
  })

  it('creates a ticket from audio + mock Whisper transcript', async () => {
    const waId = '972501234580'
    const before = memListTickets().length
    await processInboundMessage(msg({ text: 'STORE_6018', waId }), dry)
    const opened = await processInboundMessage(
      msg({
        text: null,
        waId,
        messageId: 'voice-happy-1',
        mediaKind: 'audio',
        mediaUrl: 'https://example.com/happy-voice.ogg',
      }),
      dry,
    )
    expect(opened.ticketId).toBeTruthy()
    expect(memListTickets().length).toBe(before + 1)
    const ticket = memGet(opened.ticketId!)
    expect(ticket?.description).toMatch(/מזגן/)
    expect(
      ticket?.messages.some(
        (m) => m.media_url === 'https://example.com/happy-voice.ogg',
      ),
    ).toBe(true)
  })
})
