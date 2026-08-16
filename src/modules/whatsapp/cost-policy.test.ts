import { describe, expect, it } from 'vitest'
import { shouldSendWhatsApp } from './cost-policy'

describe('shouldSendWhatsApp', () => {
  it('allows intake + confirmation', () => {
    expect(shouldSendWhatsApp('intake_reply')).toBe(true)
    expect(shouldSendWhatsApp('ticket_confirmation')).toBe(true)
  })

  it('allows lifecycle status updates; blocks marketing', () => {
    expect(shouldSendWhatsApp('status_update')).toBe(true)
    expect(shouldSendWhatsApp('marketing')).toBe(false)
  })
})
