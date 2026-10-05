import { beforeEach, describe, expect, it } from 'vitest'
import { processInboundMessage } from '@/modules/whatsapp/intake'
import { parseWhatsAppWebhook } from '@/modules/whatsapp/parse'
import type { InboundMessage } from '@/modules/whatsapp/types'
import { memListTickets } from '@/lib/data/memory-store'
import {
  listDocuments,
  listSpends,
  listTasks,
  resetOpsLedger,
} from '@/lib/data/ops-ledger'
import { ledgerDecisions } from '@/modules/decisions/from-ledger'
import { canExecuteSpend } from '@/modules/spend/policy'
import { classifyInbound, isAriSender, parseDeskDecision } from '@/modules/whatsapp/classify'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

const dry = { skipOutboundGraph: true as const }
const ARI = '972509881951'

function msg(partial: Partial<InboundMessage> & { text?: string | null }): InboundMessage {
  return {
    messageId: partial.messageId ?? `m_${Math.random().toString(36).slice(2)}`,
    waId: partial.waId ?? '972501111111',
    phoneNumberId: null,
    text: partial.text ?? null,
    mediaUrl: partial.mediaUrl ?? null,
    mediaKind: partial.mediaKind ?? null,
    fileName: partial.fileName ?? null,
    timestamp: '1',
    sourceHint: 'demo',
  }
}

describe('WhatsApp desk loop', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    delete process.env.OPENAI_API_KEY
    delete process.env.AI_GATEWAY_API_KEY
    resetOpsLedger()
  })

  it('classifies money, a file, and several items before a ticket', () => {
    expect(classifyInbound({ text: 'המזגן לא עובד', mediaKind: null })).toBe('fault')
    expect(classifyInbound({ text: '₪400 לספק בסניף 6018', mediaKind: null })).toBe('money')
    expect(classifyInbound({ text: null, mediaKind: 'document' })).toBe('document')
    expect(
      classifyInbound({
        text: 'לבדוק מזגן בסניף 6018 עד מחר וגם לשלם ₪400 לספק',
        mediaKind: null,
      }),
    ).toBe('multi')
    expect(parseDeskDecision('לאשר')).toBe('approved')
    expect(parseDeskDecision('לדחות')).toBe('rejected')
    expect(parseDeskDecision('לבקש מידע')).toBe('needs_info')
    expect(isAriSender('972548102688')).toBe(true)
    expect(isAriSender(ARI)).toBe(true)
  })

  it('keeps a fault on the ticket path', async () => {
    const waId = '972501234501'
    const before = memListTickets().length
    await processInboundMessage(msg({ text: 'STORE_6018', waId }), dry)
    const created = await processInboundMessage(
      msg({ text: 'המזגן לא עובד', waId, messageId: 'fault-1' }),
      dry,
    )
    expect(created.ticketId).toBeTruthy()
    expect(memListTickets().length).toBe(before + 1)
    expect(listSpends().some((row) => row.originWaId === waId)).toBe(false)
  })

  it('lands money on Ari and blocks dispatch until he approves', async () => {
    const waId = '972501234502'
    const before = memListTickets().length
    const opened = await processInboundMessage(
      msg({ text: '₪400 לספק בסניף 6018', waId, messageId: 'money-1' }),
      dry,
    )
    expect(opened.reply).toContain('הבקשה ממתינה לאישור')
    expect(opened.reply).toContain('עדיין לא אושרה')
    expect(memListTickets().length).toBe(before)
    const spend = listSpends().find((row) => row.originWaId === waId)
    expect(spend?.storeCode).toBe('6018')
    expect(spend?.requestedAmount).toBe(400)
    expect(spend?.status).toBe('pending')
    expect(canExecuteSpend(spend)).toBe(false)
    expect(ledgerDecisions().some((item) => item.spendId === spend?.id)).toBe(true)

    const decided = await processInboundMessage(
      msg({ text: 'לאשר', waId: ARI, messageId: 'ari-approve' }),
      dry,
    )
    expect(decided.storeReply).toContain('ההוצאה אושרה')
    const after = listSpends().find((row) => row.id === spend?.id)
    expect(after?.status).toBe('approved')
    expect(canExecuteSpend(after)).toBe(true)
  })

  it('holds a PDF without a date for review', async () => {
    const waId = '972501234503'
    const before = memListTickets().length
    await processInboundMessage(msg({ text: 'STORE_6018', waId }), dry)
    const opened = await processInboundMessage(
      msg({
        text: null,
        waId,
        messageId: 'pdf-1',
        mediaKind: 'document',
        mediaUrl: 'meta-media:pdf1',
        fileName: 'license.pdf',
      }),
      dry,
    )
    expect(opened.reply).toContain('ממתין לבדיקה')
    expect(memListTickets().length).toBe(before)
    const doc = listDocuments().find((row) => row.originWaId === waId)
    expect(doc?.intakeStatus).toBe('needs_review')
    expect(doc?.extractedExpiry).toBeNull()
    expect(ledgerDecisions().some((item) => item.id === `doc:${doc?.id}`)).toBe(true)
  })

  it('keeps a recording without a transcript off the ticket list', async () => {
    const waId = '972501234504'
    const before = memListTickets().length
    const opened = await processInboundMessage(
      msg({
        text: null,
        waId,
        messageId: 'voice-1',
        mediaKind: 'audio',
        mediaUrl: 'meta-media:voice1',
      }),
      dry,
    )
    expect(opened.reply).toContain('ההקלטה התקבלה')
    expect(opened.ticketId).toBeUndefined()
    expect(memListTickets().length).toBe(before)
    const task = listTasks().find((row) => row.title.includes('תמלול'))
    expect(task?.needsClarification).toBe(true)
    expect(ledgerDecisions().some((item) => item.id === `task:${task?.id}`)).toBe(true)
  })

  it('splits several items and turns the money part into a spend', async () => {
    const waId = '972501234505'
    const before = memListTickets().length
    const opened = await processInboundMessage(
      msg({
        text: 'לבדוק מזגן בסניף 6018 עד מחר וגם לשלם ₪400 לספק',
        waId,
        messageId: 'multi-1',
      }),
      dry,
    )
    expect(opened.reply).toContain('ממתינה לאישור')
    expect(memListTickets().length).toBe(before)
    const spend = listSpends().find((row) => row.originWaId === waId)
    expect(spend?.requestedAmount).toBe(400)
    expect(spend?.status).toBe('pending')
    expect(canExecuteSpend(spend)).toBe(false)
    expect(listTasks().filter((row) => row.storeCode === '6018').length).toBeGreaterThan(1)
  })

  it('reads Ari’s button as the same three words', () => {
    const [hit] = parseWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'b1',
                    from: ARI,
                    type: 'interactive',
                    interactive: { button_reply: { id: 'desk_reject', title: 'לדחות' } },
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(hit?.text).toBe('לדחות')
  })
})
