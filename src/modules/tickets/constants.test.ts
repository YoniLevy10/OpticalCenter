import { describe, expect, it } from 'vitest'
import { parseStoreCodeFromText, storeWhatsAppPrefill } from '@/modules/tickets/constants'

describe('store code parsing', () => {
  it('parses STORE_172 prefill', () => {
    expect(parseStoreCodeFromText(storeWhatsAppPrefill('172'))).toBe('172')
  })

  it('parses bare numeric code', () => {
    expect(parseStoreCodeFromText('172')).toBe('172')
  })

  it('parses STORE 104', () => {
    expect(parseStoreCodeFromText('STORE 104')).toBe('104')
  })
})
