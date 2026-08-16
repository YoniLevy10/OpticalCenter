import type { Actor, MemberRole, Membership } from '@/lib/auth/types'

const HQ_ROLES: MemberRole[] = [
  'global_admin',
  'global_maintenance',
  'country_manager',
  'regional_manager',
  'store_manager',
]

const TECH_ROLES: MemberRole[] = [
  'internal_technician',
  'external_provider',
]

function hasHq(memberships: Membership[]) {
  return memberships.some((m) => HQ_ROLES.includes(m.role))
}

function hasTech(memberships: Membership[]) {
  return memberships.some((m) => TECH_ROLES.includes(m.role))
}

/**
 * Post-login home: tech-only → /tech, otherwise HQ queue.
 * Users with both HQ and tech memberships land in ops.
 *
 * Edge-safe: type-only import from auth/types (no node:crypto).
 */
export function resolveHomePath(
  actor: Pick<Actor, 'memberships'>,
): '/tech' | '/ops/tickets' {
  if (hasTech(actor.memberships) && !hasHq(actor.memberships)) {
    return '/tech'
  }
  return '/ops/tickets'
}

/**
 * Demo / E2E entry: FORCE_MEMORY or ALLOW_TEST_AUTH skip real session gate.
 * Intentionally does not check NODE_ENV — middleware and login UI use the same flag.
 */
export function shouldAllowDemoEntry(): boolean {
  return (
    process.env.MAINTAINOS_FORCE_MEMORY === '1' ||
    process.env.MAINTAINOS_ALLOW_TEST_AUTH === '1'
  )
}
