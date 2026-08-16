import {
  canReadTicket,
  canTechActOnTicket,
  filterTicketsForActor,
  type Actor,
  type TicketScopeRow,
} from '@/lib/auth/types'

/** Coerce a ticket-like row into TicketScopeRow when hierarchy cols are present. */
export function toTicketScope(ticket: {
  id: string
  organization_id?: string | null
  country_id?: string | null
  region_id?: string | null
  store_id?: string | null
  assigned_to?: string | null
  status: string
}): TicketScopeRow | null {
  if (
    !ticket.organization_id ||
    !ticket.country_id ||
    !ticket.region_id ||
    !ticket.store_id
  ) {
    return null
  }
  return {
    id: ticket.id,
    organization_id: ticket.organization_id,
    country_id: ticket.country_id,
    region_id: ticket.region_id,
    store_id: ticket.store_id,
    assigned_to: ticket.assigned_to ?? null,
    status: ticket.status,
  }
}

/**
 * Defense-in-depth list filter when pages still fetch via system/memory.
 * Rows missing hierarchy fields are dropped (fail closed) except we keep
 * them visible only when the actor has a global HQ role — those roles do
 * not need store/region match beyond organization, which may also be absent
 * on slim selects; global roles already passed middleware/page gate.
 */
export function scopeTicketsForActor<
  T extends {
    id: string
    organization_id?: string | null
    country_id?: string | null
    region_id?: string | null
    store_id?: string | null
    assigned_to?: string | null
    status: string
  },
>(actor: Actor, tickets: T[]): T[] {
  const scoped = tickets.flatMap((t) => {
    const scope = toTicketScope(t)
    return scope ? [scope] : []
  })

  if (scoped.length === tickets.length) {
    const allowed = new Set(
      filterTicketsForActor(actor, scoped).map((t) => t.id),
    )
    return tickets.filter((t) => allowed.has(t.id))
  }

  // Mixed / incomplete rows (e.g. slim Supabase select before phase 6 cols).
  return tickets.filter((t) => {
    const scope = toTicketScope(t)
    if (scope) return canReadTicket(actor, scope)
    return actor.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'global_maintenance',
    )
  })
}

export function actorCanAccessTicket(
  actor: Actor,
  ticket: {
    id: string
    organization_id?: string | null
    country_id?: string | null
    region_id?: string | null
    store_id?: string | null
    assigned_to?: string | null
    status: string
  },
): boolean {
  const scope = toTicketScope(ticket)
  if (!scope) {
    return actor.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'global_maintenance',
    )
  }
  return canReadTicket(actor, scope)
}

/** Tech portal detail: act on ticket or read via membership scope. */
export function actorCanOpenTechTicket(
  actor: Actor,
  ticket: {
    id: string
    organization_id?: string | null
    country_id?: string | null
    region_id?: string | null
    store_id?: string | null
    assigned_to?: string | null
    status: string
  },
): boolean {
  const scope = toTicketScope(ticket)
  if (!scope) {
    // Slim row: allow only when assigned to this actor (or unassigned pool).
    return (
      ticket.assigned_to === actor.id ||
      (!ticket.assigned_to && ticket.status === 'assigned')
    )
  }
  return canTechActOnTicket(actor, scope) || canReadTicket(actor, scope)
}
