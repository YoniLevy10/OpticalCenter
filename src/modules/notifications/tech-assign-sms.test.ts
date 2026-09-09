import { describe, expect, it } from 'vitest'
import {
  RECOMMENDED_SMS_019_SENDER,
  buildTechnicianAssignedSms,
} from './tech-assign-sms'

describe('buildTechnicianAssignedSms', () => {
  it('builds a clear Hebrew assign ping with store + link', () => {
    const text = buildTechnicianAssignedSms({
      displayNumber: 'OC-16',
      storeName: 'תל אביב אבן גבירול',
      link: 'https://optical-center-rose.vercel.app/tech/abc',
    })
    expect(text).toContain('שיוך חדש · תקלה OC-16')
    expect(text).toContain('תל אביב אבן גבירול')
    expect(text).toContain('לטיפול בטלפון:')
    expect(text).toContain('https://optical-center-rose.vercel.app/tech/abc')
  })

  it('falls back when store/display missing', () => {
    const text = buildTechnicianAssignedSms({
      displayNumber: '',
      storeName: '  ',
      link: 'https://example.com/t',
    })
    expect(text).toContain('שיוך חדש · תקלה')
    expect(text).not.toContain('תקלה תקלה')
    expect(text).toContain('חנות')
  })
})

describe('RECOMMENDED_SMS_019_SENDER', () => {
  it('fits 019 alphanumeric source rules (opc)', () => {
    expect(RECOMMENDED_SMS_019_SENDER).toBe('opc')
    expect(RECOMMENDED_SMS_019_SENDER.length).toBeLessThanOrEqual(11)
    expect(RECOMMENDED_SMS_019_SENDER).toMatch(/^[A-Za-z0-9]+$/)
  })
})
