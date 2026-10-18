import { describe, expect, it } from 'vitest'
import { isWhatsAppOutsideWindowError } from './send'

describe('isWhatsAppOutsideWindowError', () => {
  it('detects Meta codes and Hebrew/English window messages', () => {
    expect(isWhatsAppOutsideWindowError(null, 131047, null)).toBe(true)
    expect(isWhatsAppOutsideWindowError(null, 131026, null)).toBe(true)
    expect(isWhatsAppOutsideWindowError(null, null, 2018034)).toBe(true)
    expect(
      isWhatsAppOutsideWindowError(
        'חלון 24 השעות של WhatsApp פג — נדרשת הודעת תבנית',
      ),
    ).toBe(true)
    expect(isWhatsAppOutsideWindowError('(#131047) Message failed', 131047)).toBe(
      true,
    )
    expect(isWhatsAppOutsideWindowError('rate limit')).toBe(false)
  })
})
