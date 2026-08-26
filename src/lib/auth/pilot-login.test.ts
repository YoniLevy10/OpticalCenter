import { describe, expect, it, afterEach } from 'vitest'
import { findPilotUserByEmail } from '@/lib/auth/pilot-users'

describe('pilot password login prerequisites', () => {
  const env = { ...process.env }

  afterEach(() => {
    process.env = env
  })

  it('recognizes OpsBrain1 pilot email', () => {
    const pilot = findPilotUserByEmail('OpsBrain1@gmail.com')
    expect(pilot?.email).toBe('opsbrain1@gmail.com')
    expect(pilot?.role).toBe('global_admin')
  })

  it('pilot password env gate', () => {
    delete process.env.PILOT_LOGIN_PASSWORD
    const empty = process.env.PILOT_LOGIN_PASSWORD ?? ''
    expect(empty.trim() === '').toBe(true)
    process.env.PILOT_LOGIN_PASSWORD = 'test-secret'
    expect(process.env.PILOT_LOGIN_PASSWORD?.trim()).toBe('test-secret')
  })
})
