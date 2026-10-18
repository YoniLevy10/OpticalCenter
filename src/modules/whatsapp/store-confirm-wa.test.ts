import { describe, expect, it, beforeEach } from 'vitest'
import {
  memReset,
  memCreate,
  memAddMessage,
  memGet,
  memLinkStorePhone,
  DEMO_TECH_ID,
  MEM_COUNTRY_ID,
} from '@/lib/data/memory-store'
import { updateStatus } from '@/modules/tickets/service'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'
import { processInboundMessage } from './intake'
import { parseWhatsAppWebhook } from './parse'
import {
  storeConfirmButtonId,
  storeRejectButtonId,
} from '@/modules/tickets/wa-store-confirm'
import type { InboundMessage } from './types'

function msg(partial: Partial<InboundMessage> & { waId: string }): InboundMessage {
  return {
    messageId: `m_${Math.random().toString(36).slice(2, 10)}`,
    phoneNumberId: 'wa_phone_il_demo',
    text: null,
    mediaUrl: null,
    mediaKind: null,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...partial,
  }
}

async function seedResolved(opts: {
  storeCode: string
  waId: string
  description: string
}) {
  const store = israelStoresAsRows().find((s) => s.code === opts.storeCode)!
  const created = memCreate({
    store,
    description: opts.description,
    priority: 'high',
    category: 'hvac',
    status: 'assigned',
    assigned_to: DEMO_TECH_ID,
    reporterPhone: opts.waId,
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
  // B03 quality hold starts on resolve — expire so WA confirm can close in tests.
  const mem = memGet(created.id)!
  mem.quality_hold_until = new Date(Date.now() - 1000).toISOString()
  return created
}

describe('store confirm via WhatsApp (C02 hardening)', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('closes a resolved ticket when the store taps אשר תיקון', async () => {
    const waId = '972501112233'
    const created = await seedResolved({
      storeCode: '6006',
      waId,
      description: 'מזגן לא מקרר',
    })
    // Expire quality hold so WA confirm can finalize close in this test.
    const mem = memGet(created.id)!
    mem.quality_hold_until = new Date(Date.now() - 1000).toISOString()

    const result = await processInboundMessage(
      msg({
        waId,
        text: 'מאשר',
        interactiveId: storeConfirmButtonId(created.id),
      }),
      { skipOutboundGraph: true },
    )

    expect(result.ok).toBe(true)
    expect(result.reply || '').toMatch(/נסגרה|אישור/)
    expect(memGet(created.id)?.status).toBe('closed')
    expect(memGet(created.id)?.store_confirmed_at).toBeTruthy()
  })

  it('closes via free-text מאשר when a single resolved ticket matches', async () => {
    const waId = '972509998877'
    const created = await seedResolved({
      storeCode: '6029',
      waId,
      description: 'קצר חשמלי',
    })
    memGet(created.id)!.quality_hold_until = new Date(Date.now() - 1000).toISOString()

    const result = await processInboundMessage(msg({ waId, text: 'מאשר' }), {
      skipOutboundGraph: true,
    })

    expect(result.ok).toBe(true)
    expect(memGet(created.id)?.status).toBe('closed')
  })

  it('rejects store_confirm button from another store sender (negative auth)', async () => {
    const ownerWa = '972501112233'
    const otherWa = '972507776655'
    const created = await seedResolved({
      storeCode: '6006',
      waId: ownerWa,
      description: 'מזגן לא מקרר',
    })
    // Other store identity — linked elsewhere, not owner of this ticket.
    const otherStore = israelStoresAsRows().find((s) => s.code === '6029')!
    memLinkStorePhone(otherWa, otherStore.id, MEM_COUNTRY_ID)

    const result = await processInboundMessage(
      msg({
        waId: otherWa,
        text: 'מאשר',
        interactiveId: storeConfirmButtonId(created.id),
      }),
      { skipOutboundGraph: true },
    )

    expect(result.ok).toBe(false)
    expect(result.error).toBe('store_confirm_unauthorized')
    expect(memGet(created.id)?.status).toBe('resolved')
    expect(memGet(created.id)?.store_confirmed_at).toBeFalsy()
    expect(result.reply || '').toMatch(/הרשאה/)
  })

  it('does not auto-pick latest when multiple tickets await מאשר', async () => {
    const waId = '972501112233'
    const first = await seedResolved({
      storeCode: '6006',
      waId,
      description: 'מזגן א',
    })
    // Ensure second is "newer"
    await new Promise((r) => setTimeout(r, 5))
    const second = await seedResolved({
      storeCode: '6006',
      waId,
      description: 'מזגן ב',
    })

    const result = await processInboundMessage(msg({ waId, text: 'מאשר' }), {
      skipOutboundGraph: true,
    })

    expect(result.ok).toBe(true)
    expect(result.reply || '').toMatch(/יותר מתקלה אחת/)
    expect(memGet(first.id)?.status).toBe('resolved')
    expect(memGet(second.id)?.status).toBe('resolved')
  })

  it('returns לא נפתר to in_progress without wiping history', async () => {
    const waId = '972501112233'
    const created = await seedResolved({
      storeCode: '6006',
      waId,
      description: 'דלת לא נסגרת',
    })
    const eventsBefore = memGet(created.id)!.events.length
    const messagesBefore = memGet(created.id)!.messages.length

    const result = await processInboundMessage(
      msg({
        waId,
        text: 'לא נפתר',
        interactiveId: storeRejectButtonId(created.id),
      }),
      { skipOutboundGraph: true },
    )

    expect(result.ok).toBe(true)
    const ticket = memGet(created.id)!
    expect(ticket.status).toBe('in_progress')
    expect(ticket.resolved_at).toBeFalsy()
    expect(ticket.store_confirmed_at).toBeFalsy()
    expect(ticket.events.length).toBeGreaterThan(eventsBefore)
    expect(ticket.messages.length).toBeGreaterThanOrEqual(messagesBefore)
    expect(ticket.events.some((e) => e.event_type === 'store_rejected')).toBe(
      true,
    )
    expect(result.reply || '').toMatch(/טיפול|בטיפול/)
  })

  it('keeps Ari spend מאשר off the store-confirm path', async () => {
    // Desk phones include 972548102688 in default classify config.
    const ari = '972548102688'
    const created = await seedResolved({
      storeCode: '6006',
      waId: '972501112233',
      description: 'מזגן',
    })

    const result = await processInboundMessage(msg({ waId: ari, text: 'מאשר' }), {
      skipOutboundGraph: true,
    })

    // Ari free-text must not close a store ticket they do not own.
    expect(memGet(created.id)?.status).toBe('resolved')
    expect(result.error).not.toBe('store_confirm_failed')
  })

  it('parses store_confirm and store_reject interactive buttons', () => {
    const ticketId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const [confirm] = parseWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'w1',
                    from: '972501112233',
                    type: 'interactive',
                    interactive: {
                      button_reply: {
                        id: storeConfirmButtonId(ticketId),
                        title: 'אשר תיקון',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(confirm?.text).toBe('מאשר')
    expect(confirm?.interactiveId).toBe(storeConfirmButtonId(ticketId))

    const [reject] = parseWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'w2',
                    from: '972501112233',
                    type: 'interactive',
                    interactive: {
                      button_reply: {
                        id: storeRejectButtonId(ticketId),
                        title: 'לא נפתר',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(reject?.text).toBe('לא נפתר')
    expect(reject?.interactiveId).toBe(storeRejectButtonId(ticketId))
  })
})
