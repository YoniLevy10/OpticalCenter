import { describe, expect, it } from 'vitest'
import {
  appendScanHistory,
  buildAssetQrPayload,
  extractAssetCodeFromPayload,
  findAssetByCode,
  looksLikeProductBarcode,
  normalizeBarcode,
} from './barcode'

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

describe('payload helpers', () => {
  it('builds and extracts optical asset QR payloads', () => {
    expect(buildAssetQrPayload('ac-04')).toBe('optical:asset:AC-04')
    expect(extractAssetCodeFromPayload('optical:asset:AC-04')).toBe('AC-04')
    expect(extractAssetCodeFromPayload('meditactic:sku:OPT-01')).toBe('OPT-01')
    expect(extractAssetCodeFromPayload('7290000000001')).toBe('7290000000001')
  })
})

describe('findAssetByCode', () => {
  const assets = [
    {
      id: '1',
      code: 'AC-04',
      name: 'יחידת מיזוג',
      barcode: '7290000000001',
      store_code: '172',
    },
    {
      id: '2',
      code: 'OPT-01',
      name: 'מכשיר מדידה',
      barcode: null,
      store_code: '101',
    },
  ]

  it('matches barcode exactly before code', () => {
    expect(findAssetByCode(assets, '7290000000001')?.id).toBe('1')
  })

  it('matches internal code and optical QR payload', () => {
    expect(findAssetByCode(assets, 'opt-01')?.id).toBe('2')
    expect(findAssetByCode(assets, 'optical:asset:AC-04')?.id).toBe('1')
  })

  it('returns null when ambiguous or missing', () => {
    expect(findAssetByCode(assets, 'NOPE')).toBeNull()
  })
})

describe('appendScanHistory', () => {
  it('dedupes by query and keeps newest first', () => {
    const next = appendScanHistory(
      { query: 'AC-04', at: 2, success: true, foundName: 'מזגן' },
      [{ query: 'AC-04', at: 1, success: false }],
    )
    expect(next).toHaveLength(1)
    expect(next[0]?.at).toBe(2)
    expect(next[0]?.success).toBe(true)
  })
})
