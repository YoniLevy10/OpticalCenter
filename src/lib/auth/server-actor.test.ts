import { describe, expect, it } from 'vitest'
import { DEMO_ACTORS, memListMemberships } from '@/lib/auth/memory-memberships'
import { resolveServerTechId } from '@/lib/auth/server-actor'
import {
  actorCanOpenTechTicket,
  scopeTicketsForActor,
  toTicketScope,
} from '@/lib/auth/ticket-scope'
import type { Actor, TicketScopeRow } from '@/lib/auth/types'

process.env.MAINTAINOS_FORCE_MEMORY = '1'
process.env.MAINTAINOS_ALLOW_TEST_AUTH = '1'

function actorFor(id: string, authVia: Actor['authVia'] = 'test_bearer'): Actor {
  return {
    id,
    memberships: memListMemberships(id),
    authVia,
  }
}

const ticketA: TicketScopeRow = {
  id: 't1',
  organization_id: '11111111-1111-1111-1111-111111111111',
  country_id: '22222222-2222-2222-2222-222222222222',
  region_id: 'ta',
  store_id: 'demo-172',
  assigned_to: DEMO_ACTORS.techA,
  status: 'assigned',
}

describe('server actor tech id', () => {
  it('prefers tech session actor over query techId', () => {
    const actor = actorFor(DEMO_ACTORS.techA)
    expect(resolveServerTechId(actor, DEMO_ACTORS.techB)).toBe(DEMO_ACTORS.techA)
  })

  it('falls back to query when actor is HQ (demo mid-switch)', () => {
    const hq = actorFor(DEMO_ACTORS.globalAdmin)
    expect(resolveServerTechId(hq, DEMO_ACTORS.techA)).toBe(DEMO_ACTORS.techA)
  })
})

describe('ticket scope helpers', () => {
  it('filters list to readable tickets', () => {
    const fr = actorFor(DEMO_ACTORS.countryFr)
    const rows = scopeTicketsForActor(fr, [ticketA])
    expect(rows).toHaveLength(0)

    const il = actorFor(DEMO_ACTORS.countryIl)
    expect(scopeTicketsForActor(il, [ticketA])).toHaveLength(1)
  })

  it('tech A can open assigned ticket; tech B cannot', () => {
    expect(actorCanOpenTechTicket(actorFor(DEMO_ACTORS.techA), ticketA)).toBe(
      true,
    )
    expect(actorCanOpenTechTicket(actorFor(DEMO_ACTORS.techB), ticketA)).toBe(
      false,
    )
  })

  it('toTicketScope returns null when hierarchy missing', () => {
    expect(
      toTicketScope({
        id: 'x',
        store_id: 'demo-172',
        status: 'new',
        assigned_to: null,
      }),
    ).toBeNull()
  })
})
