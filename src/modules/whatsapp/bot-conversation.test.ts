/**
 * End-to-end conversation contract for store WhatsApp intake:
 * templates (WA_COPY) → optional AI rewrite via Vercel Gateway → ticket open.
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

  it('rewrites ask-store template via Vercel Gateway when enabled', async () => {
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
    expect(r.reply).toBe('היי! שלחו קוד חנות או סרקו QR ליד הדלפק.')
    expect(generateTextMock).toHaveBeenCalled()
    const call = generateTextMock.mock.calls[0]?.[0] as {
      system?: string
      prompt?: string
      model?: string
    }
    expect(call.system).toMatch(/MaintainOS|Optical Center/)
    expect(call.prompt).toContain(WA_COPY.askStore.slice(0, 20))
    expect(call.model).toMatch(/^anthropic\//)
  })

  it('falls back to WA_COPY when Gateway call throws', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    process.env.WHATSAPP_AI_ENABLED = 'true'
    process.env.WHATSAPP_AI_INTAKE_ENABLED = 'false'
    process.env.AI_GATEWAY_API_KEY = 'gw-test'
    generateTextMock.mockRejectedValue(new Error('boom'))

    const r = await processInboundMessage(msg({ text: 'שלום' }, waId), {
      skipOutboundGraph: true,
    })
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeFalsy()
    expect(r.state).toBe('awaiting_store')
    expect(r.reply).toBe(WA_COPY.askStore)
  })
})
