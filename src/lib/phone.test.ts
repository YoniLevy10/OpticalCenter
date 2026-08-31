import { describe, expect, it } from 'vitest'
import { normalizePhoneDigits, sanitizePhoneInput } from './phone'

describe('normalizePhoneDigits', () => {
  it('converts IL local to 972…', () => {
    expect(normalizePhoneDigits('050-123-4567')).toBe('972501234567')
    expect(normalizePhoneDigits('+972 50-123-4567')).toBe('972501234567')
  })

  it('returns null for empty/invalid', () => {
    expect(normalizePhoneDigits('')).toBeNull()
    expect(normalizePhoneDigits('123')).toBeNull()
    expect(normalizePhoneDigits(null)).toBeNull()
  })
})

describe('sanitizePhoneInput', () => {
  it('trims or nulls', () => {
    expect(sanitizePhoneInput('  0501  ')).toBe('0501')
    expect(sanitizePhoneInput('   ')).toBeNull()
  })
})
