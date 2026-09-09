import { describe, expect, it } from 'vitest'
import { resolveTechnicianNotifyPhone } from './tech-assign-sms'

describe('resolveTechnicianNotifyPhone', () => {
  const ticket = {
    reporter_phone: '972501112233',
  }

  it('returns normalized technician phone', () => {
    expect(
      resolveTechnicianNotifyPhone({ id: 'tech', phone: '054-810-2688' }, ticket)
        .phone,
    ).toBe('972548102688')
  })

  it('skips when technician has no phone', () => {
    expect(
      resolveTechnicianNotifyPhone({ id: 'tech', phone: null }, ticket).skipped,
    ).toBe('no_tech_phone')
  })

  it('refuses when technician phone equals reporter phone', () => {
    const r = resolveTechnicianNotifyPhone(
      { id: 'tech', phone: '0501112233' },
      ticket,
    )
    expect(r.phone).toBeNull()
    expect(r.skipped).toBe('tech_phone_is_reporter')
  })
})
