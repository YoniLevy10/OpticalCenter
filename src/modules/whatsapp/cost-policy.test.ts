import { describe, expect, it } from 'vitest'
import { shouldSendWhatsApp } from './cost-policy'

describe('shouldSendWhatsApp', () => {
  it('allows intake + confirmation', () => {
    expect(shouldSendWhatsApp('intake_reply')).toBe(true)
    expect(shouldSendWhatsApp('ticket_confirmation')).toBe(true)
  })

  it('blocks status spam and marketing', () => {
    expect(shouldSendWhatsApp('status_update')).toBe(false)
    expect(shouldSendWhatsApp('marketing')).toBe(false)
  })
})
