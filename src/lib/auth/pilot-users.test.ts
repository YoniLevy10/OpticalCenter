import { describe, expect, it } from 'vitest'
import {
  PILOT_OWNER,
  findPilotUserByEmail,
  isPilotEmail,
  normalizeEmail,
} from '@/lib/auth/pilot-users'

describe('pilot-users', () => {
  it('normalizes OpsBrain1 email case-insensitively', () => {
    expect(normalizeEmail('OpsBrain1@gmail.com')).toBe('opsbrain1@gmail.com')
    expect(findPilotUserByEmail('OpsBrain1@gmail.com')?.id).toBe(PILOT_OWNER.id)
    expect(findPilotUserByEmail('OPSBRAIN1@GMAIL.COM')?.role).toBe('global_admin')
    expect(isPilotEmail('opsbrain1@gmail.com')).toBe(true)
    expect(isPilotEmail('other@example.com')).toBe(false)
  })
})
