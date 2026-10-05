import { describe, expect, it } from 'vitest'
import {
  canTechTransition,
  filterTicketsByTab,
  isTicketRef,
  isUuid,
  nextStatusActions,
  resolveTechId,
  snippet,
  type TechTicketRow,
} from './tech'

describe('tech helpers', () => {
  it('validates uuid', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('trial-6006-hvac')).toBe(false)
  })

  it('accepts demo ticket slugs', () => {
    expect(isTicketRef('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isTicketRef('trial-6006-hvac')).toBe(true)
    expect(isTicketRef('../etc/passwd')).toBe(false)
    expect(isTicketRef('')).toBe(false)
  })

  it('snippets long text', () => {
    expect(snippet('שלום', 10)).toBe('שלום')
    expect(snippet('א'.repeat(20), 10).endsWith('…')).toBe(true)
  })

  it('filters by tab', () => {
    const tickets = [
      { id: '1', status: 'assigned' },
      { id: '2', status: 'in_progress' },
      { id: '3', status: 'waiting_parts' },
      { id: '4', status: 'resolved' },
    ] as TechTicketRow[]
    expect(filterTicketsByTab(tickets, 'new_assigned').map((t) => t.id)).toEqual(['1'])
    expect(filterTicketsByTab(tickets, 'in_progress').map((t) => t.id)).toEqual(['2', '3'])
    expect(filterTicketsByTab(tickets, 'done').map((t) => t.id)).toEqual(['4'])
  })

  it('suggests next actions', () => {
    expect(nextStatusActions('assigned')).toEqual(['in_progress'])
    expect(nextStatusActions('in_progress')).toEqual([
      'waiting_parts',
      'waiting_vendor',
      'resolved',
    ])
    expect(canTechTransition('assigned', 'in_progress')).toBe(true)
    expect(canTechTransition('assigned', 'resolved')).toBe(false)
  })

  it('prefers query uuid for resolveTechId', () => {
    const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    expect(resolveTechId(id)).toBe(id)
  })
})
