import { describe, expect, it } from 'vitest'
import {
  storeWhatsAppDeepLink,
  whatsAppShareUrl,
} from '@/modules/stores/whatsapp-link'

describe('whatsapp-link', () => {
  it('builds wa.me deep link with STORE_ prefill', () => {
    expect(storeWhatsAppDeepLink('172', '972552819086')).toBe(
      'https://wa.me/972552819086?text=STORE_172',
    )
  })

  it('omits phone when missing (caller should block QR generation)', () => {
    expect(whatsAppShareUrl('STORE_172', null)).toBe(
      'https://wa.me/?text=STORE_172',
    )
  })
})
