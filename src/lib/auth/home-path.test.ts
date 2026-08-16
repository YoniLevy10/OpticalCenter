import { afterEach, describe, expect, it } from 'vitest'
import { resolveHomePath, shouldAllowDemoEntry } from '@/lib/auth/home-path'
import type { Actor, Membership, MemberRole } from '@/lib/auth/types'

const ORG = '11111111-1111-1111-1111-111111111111'

function membership(role: MemberRole): Membership {
  return {
    id: crypto.randomUUID(),
    profile_id: 'p1',
    organization_id: ORG,
    role,
    country_id: null,
    region_id: null,
    store_id: null,
  }
}

function actor(roles: MemberRole[]): Pick<Actor, 'memberships'> {
  return { memberships: roles.map(membership) }
}

describe('resolveHomePath', () => {
  it('sends tech-only actors to /tech', () => {
    expect(resolveHomePath(actor(['internal_technician']))).toBe('/tech')
    expect(resolveHomePath(actor(['external_provider']))).toBe('/tech')
  })

  it('sends HQ actors to /ops/dashboard', () => {
    expect(resolveHomePath(actor(['global_admin']))).toBe('/ops/dashboard')
    expect(resolveHomePath(actor(['country_manager']))).toBe('/ops/dashboard')
  })

  it('sends mixed HQ+tech to /ops/dashboard', () => {
    expect(
      resolveHomePath(actor(['global_maintenance', 'internal_technician'])),
    ).toBe('/ops/dashboard')
  })

  it('defaults empty memberships to ops', () => {
    expect(resolveHomePath(actor([]))).toBe('/ops/dashboard')
  })
})

describe('shouldAllowDemoEntry', () => {
  const prevForce = process.env.MAINTAINOS_FORCE_MEMORY
  const prevAllow = process.env.MAINTAINOS_ALLOW_TEST_AUTH

  afterEach(() => {
    if (prevForce === undefined) delete process.env.MAINTAINOS_FORCE_MEMORY
    else process.env.MAINTAINOS_FORCE_MEMORY = prevForce
    if (prevAllow === undefined) delete process.env.MAINTAINOS_ALLOW_TEST_AUTH
    else process.env.MAINTAINOS_ALLOW_TEST_AUTH = prevAllow
  })

  it('is true when FORCE_MEMORY=1', () => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    delete process.env.MAINTAINOS_ALLOW_TEST_AUTH
    expect(shouldAllowDemoEntry()).toBe(true)
  })

  it('is true when ALLOW_TEST_AUTH=1', () => {
    delete process.env.MAINTAINOS_FORCE_MEMORY
    process.env.MAINTAINOS_ALLOW_TEST_AUTH = '1'
    expect(shouldAllowDemoEntry()).toBe(true)
  })

  it('is false when neither flag is set', () => {
    delete process.env.MAINTAINOS_FORCE_MEMORY
    delete process.env.MAINTAINOS_ALLOW_TEST_AUTH
    expect(shouldAllowDemoEntry()).toBe(false)
  })
})
