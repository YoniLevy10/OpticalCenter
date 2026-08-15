import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyWhatsAppSignature } from '@/modules/whatsapp/signature'

describe('WhatsApp webhook signature', () => {
  it('allows when secret unset (dev)', () => {
    const prev = process.env.WHATSAPP_APP_SECRET
    delete process.env.WHATSAPP_APP_SECRET
    delete process.env.WA_APP_SECRET
    expect(verifyWhatsAppSignature('{}', null)).toBe(true)
    if (prev) process.env.WHATSAPP_APP_SECRET = prev
  })

  it('rejects missing/invalid signature when secret set', () => {
    process.env.WHATSAPP_APP_SECRET = 'test-secret'
    expect(verifyWhatsAppSignature('{"a":1}', null)).toBe(false)
    expect(verifyWhatsAppSignature('{"a":1}', 'sha256=deadbeef')).toBe(false)
    delete process.env.WHATSAPP_APP_SECRET
  })

  it('accepts valid Meta signature', () => {
    process.env.WHATSAPP_APP_SECRET = 'test-secret'
    const body = '{"object":"whatsapp_business_account"}'
    const hex = createHmac('sha256', 'test-secret').update(body, 'utf8').digest('hex')
    expect(verifyWhatsAppSignature(body, `sha256=${hex}`)).toBe(true)
    delete process.env.WHATSAPP_APP_SECRET
  })
})
