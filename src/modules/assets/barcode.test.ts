import { describe, expect, it } from 'vitest'
import { looksLikeProductBarcode, normalizeBarcode } from './barcode'

describe('normalizeBarcode', () => {
  it('trims, uppercases, and strips whitespace / control chars', () => {
    expect(normalizeBarcode('  ac-04\n')).toBe('AC-04')
    expect(normalizeBarcode('7290000000001')).toBe('7290000000001')
    expect(normalizeBarcode('ab 12')).toBe('AB12')
  })

  it('returns empty for blank input', () => {
    expect(normalizeBarcode('   ')).toBe('')
  })
})

describe('looksLikeProductBarcode', () => {
  it('accepts EAN/UPC digit lengths', () => {
    expect(looksLikeProductBarcode('12345678')).toBe(true)
    expect(looksLikeProductBarcode('7290000000001')).toBe(true)
  })

  it('accepts asset-style serials', () => {
    expect(looksLikeProductBarcode('AC-04')).toBe(true)
    expect(looksLikeProductBarcode('OPT.UNIT.12')).toBe(true)
  })

  it('rejects empty / tiny values', () => {
    expect(looksLikeProductBarcode('')).toBe(false)
    expect(looksLikeProductBarcode('ab')).toBe(false)
  })
})
