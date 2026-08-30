import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  hqProductRoles,
  techProductRoles,
} from '@/lib/auth/roles'

export type MemberRole =
  | 'global_admin'
  | 'global_maintenance'
  | 'country_manager'
  | 'regional_manager'
  | 'store_manager'
  | 'store_employee'
  | 'internal_technician'
  | 'external_provider'

export type Membership = {
  id: string
  profile_id: string
  organization_id: string
  role: MemberRole
  country_id: string | null
  region_id: string | null
  store_id: string | null
}

export type Actor = {
  id: string
  email?: string | null
  full_name?: string | null
  memberships: Membership[]
  /** How the actor was authenticated */
  authVia: 'supabase_session' | 'test_bearer'
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

export function isProductionRuntime() {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.MAINTAINOS_FORCE_MEMORY !== '1'
  )
}

export function testAuthAllowed() {
  if (isProductionRuntime()) return false
  return (
    process.env.MAINTAINOS_ALLOW_TEST_AUTH === '1' ||
    process.env.MAINTAINOS_FORCE_MEMORY === '1'
  )
}

/** Bearer test_<profileId>.<hmac> or Bearer test_<profileId> when secret unset in memory QA */
export function parseTestBearer(header: string | null): string | null {
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token.startsWith('test_')) return null
  if (!testAuthAllowed()) return null

  const rest = token.slice('test_'.length)
  const secret = process.env.MAINTAINOS_TEST_AUTH_SECRET
  if (!secret) {
    if (/^[0-9a-f-]{36}$/i.test(rest)) return rest
    return null
  }
  const [id, sig] = rest.split('.')
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const expected = createHmac('sha256', secret).update(id).digest('hex')
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(sig, 'utf8')
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
    return id
  } catch {
    return null
  }
}

export function signTestBearer(profileId: string, secret?: string) {
  const s = secret ?? process.env.MAINTAINOS_TEST_AUTH_SECRET
  if (!s) return `test_${profileId}`
  const sig = createHmac('sha256', s).update(profileId).digest('hex')
  return `test_${profileId}.${sig}`
}

export function hqRoles(): MemberRole[] {
  return hqProductRoles()
}

export function techRoles(): MemberRole[] {
  return techProductRoles()
}

export function actorHasHqAccess(actor: Actor): boolean {
  return actor.memberships.some((m) => hqRoles().includes(m.role))
}

export function actorIsTech(actor: Actor): boolean {
  return actor.memberships.some((m) => techRoles().includes(m.role))
}

export function actorPrimaryTechId(actor: Actor): string | null {
  if (!actorIsTech(actor)) return null
  return actor.id
}

export type TicketScopeRow = {
  id: string
  organization_id: string
  country_id: string
  region_id: string
  store_id: string
  assigned_to: string | null
  status: string
}

/** Defense-in-depth ticket visibility for API layer. */
export function canReadTicket(actor: Actor, ticket: TicketScopeRow): boolean {
  for (const m of actor.memberships) {
    if (m.organization_id !== ticket.organization_id) continue
    if (m.role === 'global_admin' || m.role === 'global_maintenance') return true
    if (m.role === 'country_manager' && m.country_id === ticket.country_id)
      return true
    if (m.role === 'regional_manager' && m.region_id === ticket.region_id)
      return true
    if (
      (m.role === 'store_manager' || m.role === 'store_employee') &&
      m.store_id === ticket.store_id
    ) {
      return true
    }
    if (
      (m.role === 'internal_technician' || m.role === 'external_provider') &&
      ticket.assigned_to === actor.id
    ) {
      return true
    }
  }
  return false
}

export function canMutateHqTicket(actor: Actor, ticket: TicketScopeRow): boolean {
  for (const m of actor.memberships) {
    if (m.organization_id !== ticket.organization_id) continue
    if (m.role === 'global_admin' || m.role === 'global_maintenance') return true
    if (m.role === 'country_manager' && m.country_id === ticket.country_id)
      return true
    if (m.role === 'regional_manager' && m.region_id === ticket.region_id)
      return true
  }
  return false
}

export function canTechActOnTicket(actor: Actor, ticket: TicketScopeRow): boolean {
  if (!actorIsTech(actor)) return false
  if (ticket.assigned_to === actor.id) return true
  if (
    !ticket.assigned_to &&
    ticket.status === 'assigned' &&
    actor.memberships.some((m) => m.role === 'internal_technician')
  ) {
    return true
  }
  return false
}

export function filterTicketsForActor<T extends TicketScopeRow>(
  actor: Actor,
  tickets: T[],
): T[] {
  return tickets.filter((t) => canReadTicket(actor, t))
}
