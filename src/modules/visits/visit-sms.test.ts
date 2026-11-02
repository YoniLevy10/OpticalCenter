import { describe, expect, it } from 'vitest'
import {
  buildVisitFaultsSms,
  faultBelongsInVisitSms,
  isDeliverableTechPhone,
} from './visit-sms'
import { suggestVisitVendor } from '@/modules/vendors/visit-pick'

describe('visit sms', () => {
  it('accepts the test technician and skips demo numbers', () => {
    expect(isDeliverableTechPhone('0548102688')).toBe(true)
    expect(isDeliverableTechPhone('972548102688')).toBe(true)
    expect(isDeliverableTechPhone('972501100103')).toBe(false)
    expect(isDeliverableTechPhone('972501234567')).toBe(false)
  })

  it('lists the faults of one visit', () => {
    const text = buildVisitFaultsSms({
      storeName: 'ירושלים כיכר ציון',
      faults: [
        { display: 'OC-18007', title: 'מזגן המעבדה מטפטף' },
        { display: 'OC-18012', title: 'המזגן בחלון הראווה לא עובד' },
      ],
    })
    expect(text).toContain('ביקור Optical Center')
    expect(text).toContain('ירושלים כיכר ציון')
    expect(text).toContain('1. OC-18007 · מזגן המעבדה מטפטף')
    expect(text).toContain('2. OC-18012 · המזגן בחלון הראווה לא עובד')
  })

  it('does not text a fault that still needs Ari', () => {
    expect(
      faultBelongsInVisitSms({
        status: 'blocked',
        error: 'נדרש אישור של ארי לפני הוצאה או התחייבות',
      }),
    ).toBe(false)
    expect(
      faultBelongsInVisitSms({
        status: 'blocked',
        error: 'הבקשה נדחתה',
      }),
    ).toBe(false)
  })

  it('suggests the technician who can actually receive the SMS', () => {
    const pick = suggestVisitVendor(
      [
        {
          id: 'seed',
          name: 'דרום אייר · מיזוג',
          specialties: 'hvac',
          coverage: ['JLM', 'S'],
          phone: '972501100103',
        },
        {
          id: 'yoni',
          name: 'יוני לוי · מיזוג',
          specialties: 'hvac',
          coverage: ['JLM', 'TA', 'CTR', 'HFA', 'N', 'S'],
          phone: '0548102688',
        },
      ],
      { category: 'hvac', city: 'ירושלים' },
    )
    expect(pick?.id).toBe('yoni')
  })
})
