import type { Actor, MemberRole, Membership } from '@/lib/auth/types'

const HQ_ROLES: MemberRole[] = [
  'global_admin',
  'global_maintenance',
  'country_manager',
  'regional_manager',
  'store_manager',
]

const TECH_ROLES: MemberRole[] = ['internal_technician', 'external_provider']

export type HomePath = '/tech' | '/ops/dashboard' | '/store'

function hasHq(memberships: Membership[]) {
  return memberships.some((m) => HQ_ROLES.includes(m.role))
}

function hasTech(memberships: Membership[]) {
  return memberships.some((m) => TECH_ROLES.includes(m.role))
}

/** Store staff with no HQ/tech role — store portal only. */
export function isStoreEmployeeOnly(memberships: Membership[]): boolean {
  if (memberships.length === 0) return false
  const roles = memberships.map((m) => m.role)
  const onlyStore = roles.every(
    (r) => r === 'store_employee' || r === 'store_manager',
  )
  return onlyStore && roles.includes('store_employee') && !hasHq(memberships)
}

export function actorIsStoreEmployeeOnly(actor: Pick<Actor, 'memberships'>): boolean {
  return isStoreEmployeeOnly(actor.memberships)
}

/**
 * Post-login home: tech-only → /tech, store employee only → /store, else HQ.
 */
export function resolveHomePath(actor: Pick<Actor, 'memberships'>): HomePath {
  if (hasTech(actor.memberships) && !hasHq(actor.memberships)) {
    return '/tech'
  }
  if (isStoreEmployeeOnly(actor.memberships)) {
    return '/store'
  }
  return '/ops/dashboard'
}

/**
 * Demo / E2E entry: FORCE_MEMORY or ALLOW_TEST_AUTH skip real session gate.
 */
export function shouldAllowDemoEntry(): boolean {
  return (
    process.env.MAINTAINOS_FORCE_MEMORY === '1' ||
    process.env.MAINTAINOS_ALLOW_TEST_AUTH === '1'
  )
}

/** Primary store_id for store_employee (first match). */
export function primaryStoreId(actor: Pick<Actor, 'memberships'>): string | null {
  const m = actor.memberships.find((x) => x.role === 'store_employee' && x.store_id)
  return m?.store_id ?? null
}
