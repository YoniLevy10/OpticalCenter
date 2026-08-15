import { describe, expect, it } from 'vitest'
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  nextStatuses,
} from '@/modules/tickets/transitions'
import { computeSlaTimestamps, formatDisplayNumber } from '@/modules/tickets/service'

describe('ticket status transitions', () => {
  it('allows happy path new → … → closed', () => {
    expect(canTransition('new', 'triaged')).toBe(true)
    expect(canTransition('triaged', 'assigned')).toBe(true)
    expect(canTransition('assigned', 'in_progress')).toBe(true)
    expect(canTransition('in_progress', 'waiting_parts')).toBe(true)
    expect(canTransition('waiting_parts', 'resolved')).toBe(true)
    expect(canTransition('resolved', 'closed')).toBe(true)
  })

  it('blocks terminal and illegal jumps', () => {
    expect(canTransition('closed', 'new')).toBe(false)
    expect(canTransition('cancelled', 'assigned')).toBe(false)
    expect(canTransition('new', 'closed')).toBe(false)
    expect(canTransition('new', 'new')).toBe(false)
  })

  it('exposes next statuses for UI buttons', () => {
    expect(nextStatuses('new')).toEqual([...ALLOWED_TRANSITIONS.new])
    expect(nextStatuses('closed')).toEqual([])
  })
})

describe('display number + SLA', () => {
  it('formats OC-{number}', () => {
    expect(formatDisplayNumber(18342)).toBe('OC-18342')
    expect(formatDisplayNumber(null)).toBeNull()
  })

  it('sets shorter SLA for critical/high', () => {
    const now = new Date('2026-08-15T10:00:00.000Z')
    const critical = computeSlaTimestamps('critical', now)
    const high = computeSlaTimestamps('high', now)
    const medium = computeSlaTimestamps('medium', now)
    expect(new Date(critical.sla_resolve_by).getTime()).toBeLessThan(
      new Date(high.sla_resolve_by).getTime(),
    )
    expect(new Date(high.sla_resolve_by).getTime()).toBeLessThan(
      new Date(medium.sla_resolve_by).getTime(),
    )
  })
})
