/**
 * Store WhatsApp intake sends the fixed template. The model does not paraphrase it.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { processInboundMessage } from '@/modules/whatsapp/intake'
import type { InboundMessage } from '@/modules/whatsapp/types'
import { WA_COPY } from '@/modules/whatsapp/copy'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

const generateTextMock = vi.fn()

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
  }
})

function msg(
  partial: Partial<InboundMessage> & Pick<InboundMessage, 'text'>,
  waId: string,
): InboundMessage {
  return {
    messageId: `m_${Math.random().toString(36).slice(2)}`,
    waId,
    phoneNumberId: null,
    text: partial.text,
    mediaUrl: partial.mediaUrl ?? null,
    mediaKind: partial.mediaKind ?? null,
    timestamp: null,
    sourceHint: 'demo',
  }
}

describe('WhatsApp store conversation (Vercel AI Gateway)', () => {
  const env = { ...process.env }

  beforeEach(() => {
    process.env = { ...env }
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    delete process.env.WHATSAPP_AI_ENABLED
    delete process.env.WHATSAPP_AI_INTAKE_ENABLED
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
    generateTextMock.mockReset()
  })

  afterEach(() => {
    process.env = env
  })

  it('opens a store ticket with template confirmation when AI is off', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    const a = await processInboundMessage(msg({ text: 'STORE_172' }, waId), {
      skipOutboundGraph: true,
    })
    expect(a.ok).toBe(true)
    expect(a.state).toBe('awaiting_description')
    expect(a.reply).toMatch(/אבן גבירול|172/)

    const b = await processInboundMessage(
      msg({ text: 'המזגן הראשי לא עובד ויש ממנו נזילה' }, waId),
      { skipOutboundGraph: true },
    )
    expect(b.ok).toBe(true)
    expect(b.ticketId).toBeTruthy()
    expect(b.reply).toMatch(/פתחתי תקלה|OC-/)
    expect(b.reply).toMatch(/גבוה|עדיפות/)
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('sends the store-code template unchanged even when the rewrite flag is on', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    process.env.WHATSAPP_AI_ENABLED = 'true'
    process.env.WHATSAPP_AI_INTAKE_ENABLED = 'false'
    process.env.AI_GATEWAY_API_KEY = 'gw-test'
    generateTextMock.mockResolvedValue({
      text: 'היי! שלחו קוד חנות או סרקו QR ליד הדלפק.',
    })

    const r = await processInboundMessage(msg({ text: 'שלום' }, waId), {
      skipOutboundGraph: true,
    })
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeFalsy()
    expect(r.state).toBe('awaiting_store')
    expect(r.reply).toBe(WA_COPY.askStore)
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('asks one English question for a thin report and does not open a ticket', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    await processInboundMessage(msg({ text: 'STORE_172' }, waId), {
      skipOutboundGraph: true,
    })
    const r = await processInboundMessage(msg({ text: 'problem' }, waId), {
      skipOutboundGraph: true,
    })
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeFalsy()
    expect(r.reply).toMatch(/What exactly is not working/i)
  })
})
