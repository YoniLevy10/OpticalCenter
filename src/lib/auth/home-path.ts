import {
  hqRoles,
  techRoles,
  type Actor,
  type Membership,
} from '@/lib/auth/types'

function hasHq(memberships: Membership[]) {
  return memberships.some((m) => hqRoles().includes(m.role))
}

function hasTech(memberships: Membership[]) {
  return memberships.some((m) => techRoles().includes(m.role))
}

/**
 * Post-login home: tech-only → /tech, otherwise HQ queue.
 * Users with both HQ and tech memberships land in ops.
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
