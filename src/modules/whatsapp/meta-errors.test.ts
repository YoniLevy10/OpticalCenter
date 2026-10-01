import { describe, expect, it } from 'vitest'
import {
  formatWhatsAppFailureMessage,
  isNonRetryableWhatsAppMetaError,
  isTransientHttpStatus,
  whatsAppMetaErrorHint,
} from './meta-errors'

describe('whatsapp meta-errors', () => {
  it('marks template/auth/window errors as non-retryable', () => {
    expect(isNonRetryableWhatsAppMetaError(131047)).toBe(true)
    expect(isNonRetryableWhatsAppMetaError(190)).toBe(true)
    expect(isNonRetryableWhatsAppMetaError(132001)).toBe(true)
    expect(isNonRetryableWhatsAppMetaError(2)).toBe(false)
    expect(isNonRetryableWhatsAppMetaError(undefined)).toBe(false)
  })

  it('detects transient HTTP statuses', () => {
    expect(isTransientHttpStatus(429)).toBe(true)
    expect(isTransientHttpStatus(503)).toBe(true)
    expect(isTransientHttpStatus(400)).toBe(false)
  })

  it('formats Hebrew hints', () => {
    expect(whatsAppMetaErrorHint(131047)).toMatch(/24/)
    expect(
      formatWhatsAppFailureMessage('תבנית', {
        httpStatus: 400,
        metaCode: 132001,
        message: 'not found',
      }),
    ).toMatch(/תבנית/)
  })
})
