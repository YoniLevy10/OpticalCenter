import { beforeEach, describe, expect, it } from 'vitest'
import {
  assign,
  createTicket,
  getById,
  updateStatus,
} from '@/modules/tickets/service'
import { canTransition, ALLOWED_TRANSITIONS } from '@/modules/tickets/transitions'
import type { TicketStatus } from '@/modules/tickets/constants'
import { DEMO_TECH_ID } from '@/lib/data/memory-store'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

async function seed(status: TicketStatus = 'new') {
  const t = await createTicket({
    storeCode: '172',
    description: 'lifecycle test',
    category: 'hvac',
    priority: 'high',
    source: 'demo',
  })
  if (status === 'new') return t
  // Walk to target status via allowed path
  const path: TicketStatus[] = []
  if (status === 'triaged') path.push('triaged')
  if (status === 'assigned' || status === 'in_progress' || status === 'waiting_parts' || status === 'resolved' || status === 'closed') {
    path.push('assigned')
  }
  if (status === 'in_progress' || status === 'waiting_parts' || status === 'resolved' || status === 'closed') {
    path.push('in_progress')
  }
  if (status === 'waiting_parts') path.push('waiting_parts')
  if (status === 'resolved' || status === 'closed') path.push('resolved')
  if (status === 'closed') path.push('closed')

  let current = t
  for (const next of path) {
    if (next === 'assigned') {
      current = await assign(current.id, DEMO_TECH_ID)
    } else {
      current = await updateStatus(current.id, next)
    }
  }
  return current
}

describe('Ticket lifecycle transitions', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
  })

  it('allows every edge in ALLOWED_TRANSITIONS', async () => {
    for (const [from, tos] of Object.entries(ALLOWED_TRANSITIONS) as [
      TicketStatus,
      TicketStatus[],
    ][]) {
      for (const to of tos) {
        expect(canTransition(from, to)).toBe(true)
      }
    }
  })

  const invalid: [TicketStatus, TicketStatus][] = [
    ['new', 'resolved'],
    ['new', 'closed'],
    ['assigned', 'resolved'],
    ['closed', 'in_progress'],
    ['cancelled', 'assigned'],
    ['new', 'new'],
    ['resolved', 'resolved'],
  ]

  for (const [from, to] of invalid) {
    it(`rejects ${from} → ${to}`, async () => {
      expect(canTransition(from, to)).toBe(false)
      const ticket = await seed(from === 'cancelled' ? 'new' : from)
      const id = ticket.id
      if (from === 'cancelled') {
        await updateStatus(id, 'cancelled')
      }
      await expect(updateStatus(id, to)).rejects.toThrow(/לא חוקי/)
    })
  }

  it('reopen resolved → in_progress clears resolved_at', async () => {
    const t = await seed('resolved')
    expect(t.resolved_at).toBeTruthy()
    const reopened = await updateStatus(t.id, 'in_progress')
    expect(reopened.status).toBe('in_progress')
    expect(reopened.resolved_at).toBeFalsy()
    const again = await getById(t.id)
    expect(again?.resolved_at).toBeFalsy()
  })
})
