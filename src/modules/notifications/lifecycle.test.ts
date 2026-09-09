import { describe, expect, it } from 'vitest'
import {
  isLifecycleEvent,
  lifecycleTemplate,
  type LifecycleTicket,
} from './lifecycle'

const ticket: LifecycleTicket = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  display_number: 'OC-42',
  number: 42,
  reporter_phone: '972501112233',
  stores: { name: 'תל אביב אבן גבירול', code: '172' },
  assignee: { full_name: 'יוסי כהן' },
}

describe('lifecycleTemplate', () => {
  it('renders assigned with store + tech name for the store reporter', () => {
    const text = lifecycleTemplate('assigned', ticket)
    expect(text).toContain('יוסי כהן')
    expect(text).toContain('תל אביב אבן גבירול')
    expect(text).toContain('OC-42')
    expect(text).toMatch(/עדכון לחנות|שייך טכנאי/)
    expect(text).not.toMatch(/שיוכת אליך/)
  })

  it('renders status templates in Hebrew', () => {
    expect(lifecycleTemplate('in_progress', ticket)).toMatch(/התחיל טיפול/)
    expect(lifecycleTemplate('waiting_parts', ticket)).toMatch(/חלקים/)
    expect(lifecycleTemplate('resolved', ticket)).toMatch(/טופלה/)
    expect(lifecycleTemplate('closed', ticket)).toMatch(/נסגרה/)
  })

  it('falls back when assignee / store missing', () => {
    const bare: LifecycleTicket = { id: 'x', number: 7 }
    expect(lifecycleTemplate('assigned', bare)).toContain('טכנאי')
    expect(lifecycleTemplate('assigned', bare)).toContain('החנות')
    expect(lifecycleTemplate('assigned', bare)).toContain('OC-7')
  })
})

describe('isLifecycleEvent', () => {
  it('accepts notify statuses only', () => {
    expect(isLifecycleEvent('assigned')).toBe(true)
    expect(isLifecycleEvent('new')).toBe(false)
    expect(isLifecycleEvent('cancelled')).toBe(false)
  })
})
