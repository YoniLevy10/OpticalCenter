import { describe, expect, it } from 'vitest'
import {
  isAssignableRole,
  isProductRole,
  PRODUCT_ROLES,
  roleLabelHe,
} from '@/lib/auth/roles'
import {
  approvedLoginEmailsFromEnv,
  isExplicitlyApprovedEmail,
} from '@/lib/auth/login-allowlist'
import { canMutateHqTicket, type Actor } from '@/lib/auth/types'

describe('product roles', () => {
  it('exposes exactly four assignable roles', () => {
    expect(PRODUCT_ROLES).toHaveLength(4)
    expect(isProductRole('global_admin')).toBe(true)
    expect(isAssignableRole('store_employee')).toBe(true)
    expect(isAssignableRole('country_manager')).toBe(false)
    expect(isAssignableRole('external_provider')).toBe(false)
  })

  it('labels legacy roles without crashing', () => {
    expect(roleLabelHe('global_admin')).toMatch(/מנהל/)
    expect(roleLabelHe('country_manager')).toMatch(/תפעול/)
    expect(roleLabelHe('store_manager')).toMatch(/חנות/)
  })
})

describe('login allowlist env', () => {
  it('parses APPROVED_LOGIN_EMAILS', () => {
    const prev = process.env.APPROVED_LOGIN_EMAILS
    process.env.APPROVED_LOGIN_EMAILS = 'A@B.com, other@x.co'
    expect(approvedLoginEmailsFromEnv()).toEqual(['a@b.com', 'other@x.co'])
    expect(isExplicitlyApprovedEmail('a@b.com')).toBe(true)
    expect(isExplicitlyApprovedEmail('nope@x.com')).toBe(false)
    expect(isExplicitlyApprovedEmail('OpsBrain1@gmail.com')).toBe(true)
    if (prev === undefined) delete process.env.APPROVED_LOGIN_EMAILS
    else process.env.APPROVED_LOGIN_EMAILS = prev
  })
})

describe('store staff cannot mutate HQ tickets', () => {
  it('rejects store_manager mutate', () => {
    const actor: Actor = {
      id: 'u1',
      memberships: [
        {
          id: 'm1',
          profile_id: 'u1',
          organization_id: '11111111-1111-1111-1111-111111111111',
          role: 'store_manager',
          country_id: null,
          region_id: null,
          store_id: 's1',
        },
      ],
      authVia: 'test_bearer',
    }
    expect(
      canMutateHqTicket(actor, {
        id: 't1',
        organization_id: '11111111-1111-1111-1111-111111111111',
        country_id: 'c',
        region_id: 'r',
        store_id: 's1',
        assigned_to: null,
        status: 'new',
      }),
    ).toBe(false)
  })
})
