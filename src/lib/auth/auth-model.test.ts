import { describe, expect, it } from 'vitest'
import {
  canMutateHqTicket,
  canReadTicket,
  canTechActOnTicket,
  parseTestBearer,
  signTestBearer,
  testAuthAllowed,
  type Actor,
  type TicketScopeRow,
} from '@/lib/auth/types'
import { DEMO_ACTORS, memListMemberships } from '@/lib/auth/memory-memberships'

process.env.MAINTAINOS_FORCE_MEMORY = '1'
process.env.MAINTAINOS_ALLOW_TEST_AUTH = '1'

function actorFor(id: string): Actor {
  return {
    id,
    memberships: memListMemberships(id),
    authVia: 'test_bearer',
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

describe('Auth model unit', () => {
  it('test auth allowed under FORCE_MEMORY', () => {
    expect(testAuthAllowed()).toBe(true)
  })

  it('parses bare test bearer', () => {
    expect(parseTestBearer(`Bearer ${signTestBearer(DEMO_ACTORS.techA)}`)).toBe(
      DEMO_ACTORS.techA,
    )
  })

  it('HQ admin can mutate; tech cannot mutate HQ', () => {
    expect(canMutateHqTicket(actorFor(DEMO_ACTORS.globalAdmin), ticketA)).toBe(
      true,
    )
    expect(canMutateHqTicket(actorFor(DEMO_ACTORS.techA), ticketA)).toBe(false)
  })

  it('Tech A can act; Tech B cannot', () => {
    expect(canTechActOnTicket(actorFor(DEMO_ACTORS.techA), ticketA)).toBe(true)
    expect(canTechActOnTicket(actorFor(DEMO_ACTORS.techB), ticketA)).toBe(false)
    expect(canReadTicket(actorFor(DEMO_ACTORS.techB), ticketA)).toBe(false)
  })

  it('country FR manager cannot read IL ticket', () => {
    expect(canReadTicket(actorFor(DEMO_ACTORS.countryFr), ticketA)).toBe(false)
    expect(canReadTicket(actorFor(DEMO_ACTORS.countryIl), ticketA)).toBe(true)
  })
})
