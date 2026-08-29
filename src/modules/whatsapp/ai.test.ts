import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  enhanceWhatsAppMessage,
  interpolateWhatsAppTemplate,
  isWhatsAppAiEnabled,
} from './ai'

describe('whatsapp ai', () => {
  const env = { ...process.env }

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.WHATSAPP_AI_ENABLED
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
  })

  afterEach(() => {
    process.env = env
  })

  it('isWhatsAppAiEnabled requires flag + Vercel Gateway auth', () => {
    expect(isWhatsAppAiEnabled()).toBe(false)
    process.env.WHATSAPP_AI_ENABLED = 'true'
    expect(isWhatsAppAiEnabled()).toBe(false)
    process.env.AI_GATEWAY_API_KEY = 'gw-test'
    expect(isWhatsAppAiEnabled()).toBe(true)
  })

  it('returns base text when AI disabled', async () => {
    const base = 'שלום! שלחו קוד חנות.'
    await expect(enhanceWhatsAppMessage(base)).resolves.toBe(base)
  })

  it('interpolates template vars', () => {
    expect(
      interpolateWhatsAppTemplate('תקלה {{ticket_number}} ב{{store_name}}', {
        ticket_number: 'OC-42',
        store_name: 'תל אביב',
      }),
    ).toBe('תקלה OC-42 בתל אביב')
  })
})
