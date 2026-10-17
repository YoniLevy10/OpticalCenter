import { describe, expect, it, beforeEach } from 'vitest'
import {
  memReset,
  memCreate,
  memAddMessage,
  memGet,
  DEMO_TECH_ID,
} from '@/lib/data/memory-store'
import { updateStatus } from '@/modules/tickets/service'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'
import { processInboundMessage } from './intake'
import { parseWhatsAppWebhook } from './parse'
import { storeConfirmButtonId } from '@/modules/tickets/wa-store-confirm'
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

describe('store confirm via WhatsApp', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('closes a resolved ticket when the store taps אשר תיקון', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6006')!
    const waId = '972501112233'
    const created = memCreate({
      store,
      description: 'מזגן לא מקרר',
      priority: 'high',
      category: 'hvac',
      status: 'assigned',
      assigned_to: DEMO_TECH_ID,
      reporterPhone: waId,
    })
    await updateStatus(created.id, 'in_progress')
    memAddMessage(created.id, {
      channel: 'tech',
      direction: 'inbound',
      body: 'בוצע',
      media_url: 'https://cdn.example/proof.jpg',
    })
    await updateStatus(created.id, 'resolved')

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

  it('closes via free-text מאשר when a resolved ticket matches the reporter', async () => {
    const store = israelStoresAsRows().find((s) => s.code === '6029')!
    const waId = '972509998877'
    const created = memCreate({
      store,
      description: 'קצר חשמלי',
      priority: 'critical',
      category: 'electrical',
      status: 'assigned',
      assigned_to: DEMO_TECH_ID,
      reporterPhone: waId,
    })
    await updateStatus(created.id, 'in_progress')
    memAddMessage(created.id, {
      channel: 'tech',
      direction: 'inbound',
      body: 'תוקן',
      media_url: 'https://cdn.example/proof2.jpg',
    })
    await updateStatus(created.id, 'resolved')

    const result = await processInboundMessage(msg({ waId, text: 'מאשר' }), {
      skipOutboundGraph: true,
    })

    expect(result.ok).toBe(true)
    expect(memGet(created.id)?.status).toBe('closed')
  })

  it('parses store_confirm interactive buttons from the webhook', () => {
    const ticketId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const [hit] = parseWhatsAppWebhook({
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
    expect(hit?.text).toBe('מאשר')
    expect(hit?.interactiveId).toBe(storeConfirmButtonId(ticketId))
  })
})
