import { describe, expect, it } from 'vitest'
import {
  faultsSms,
  mergeStorePersonNote,
  parseStorePerson,
  personForStore,
  storePersonNote,
} from './store-person'

describe('store person', () => {
  it('reads the manager’s own technician', () => {
    expect(parseStorePerson('האיש שלי למיזוג דני 0521234567')).toEqual({
      name: 'דני',
      phone: '0521234567',
      category: 'hvac',
      trade: 'מיזוג',
    })
  })

  it('does not treat a fault that mentions a phone as a person', () => {
    expect(parseStorePerson('המזגן לא עובד תתקשרו 0521234567')).toBeNull()
  })

  it('keeps an earlier branch when the same person is saved again', () => {
    const first = storePersonNote('172', 'hvac')
    const merged = mergeStorePersonNote(first, '180', 'hvac')
    expect(merged).toContain(first)
    expect(merged).toContain(storePersonNote('180', 'hvac'))
    expect(mergeStorePersonNote(merged, '172', 'hvac')).toBe(merged)
  })

  it('finds the person saved for that store and trade', () => {
    const note = storePersonNote('172', 'hvac')
    expect(
      personForStore(
        [{ full_name: 'דני', phone: '0521234567', notes: note }],
        '172',
        'hvac',
      ),
    ).toEqual({ name: 'דני', phone: '0521234567' })
    expect(
      personForStore(
        [{ full_name: 'דני', phone: '0521234567', notes: note }],
        '172',
        'plumbing',
      ),
    ).toBeNull()
  })

  it('keeps the SMS to the faults of one visit', () => {
    expect(faultsSms('תל אביב אבן גבירול', ['נזילה מהכיור', 'נזילה מהשירותים'])).toContain(
      'ביקור אחד',
    )
  })
})
