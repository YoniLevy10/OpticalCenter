import { describe, expect, it } from 'vitest'
import { normalizeBusinessPhone } from './business-phone'

describe('normalizeBusinessPhone', () => {
  it('strips non-digits', () => {
    expect(normalizeBusinessPhone('+972 55-281-9086')).toBe('972552819086')
  })

  it('returns null for empty', () => {
    expect(normalizeBusinessPhone('')).toBeNull()
    expect(normalizeBusinessPhone(null)).toBeNull()
    expect(normalizeBusinessPhone(undefined)).toBeNull()
    expect(normalizeBusinessPhone('---')).toBeNull()
  })
})
