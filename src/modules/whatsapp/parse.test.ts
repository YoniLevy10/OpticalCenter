import { describe, expect, it } from 'vitest'
import { inferSourceFromText, parseWhatsAppWebhook } from '@/modules/whatsapp/parse'

describe('parseWhatsAppWebhook', () => {
  it('extracts text message with phone_number_id', () => {
    const messages = parseWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'pnid_il' },
                messages: [
                  {
                    id: 'wamid.1',
                    from: '972501234567',
                    timestamp: '1710000000',
                    type: 'text',
                    text: { body: 'STORE_172' },
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      messageId: 'wamid.1',
      waId: '972501234567',
      phoneNumberId: 'pnid_il',
      text: 'STORE_172',
    })
  })

  it('extracts image caption', () => {
    const messages = parseWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid.2',
                    from: '972501111111',
                    type: 'image',
                    image: { id: 'img1', caption: 'נזילה' },
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(messages[0]?.text).toBe('נזילה')
    expect(messages[0]?.mediaUrl).toBe('meta-media:img1')
  })
})

describe('inferSourceFromText', () => {
  it('marks STORE_ prefill as qr_whatsapp', () => {
    expect(inferSourceFromText('STORE_172')).toBe('qr_whatsapp')
  })

  it('respects nfc hint', () => {
    expect(inferSourceFromText('STORE_172', 'nfc_whatsapp')).toBe('nfc_whatsapp')
  })
})
