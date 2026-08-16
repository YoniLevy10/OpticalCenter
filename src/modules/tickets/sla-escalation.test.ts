import { describe, expect, it } from 'vitest'
import {
  bumpPriorityTowardCritical,
  selectTicketsForSlaEscalation,
} from './sla-escalation'

describe('bumpPriorityTowardCritical', () => {
  it('steps toward critical', () => {
    expect(bumpPriorityTowardCritical('low')).toBe('medium')
    expect(bumpPriorityTowardCritical('medium')).toBe('high')
    expect(bumpPriorityTowardCritical('high')).toBe('critical')
    expect(bumpPriorityTowardCritical('critical')).toBe('critical')
  })
})

describe('selectTicketsForSlaEscalation', () => {
  const now = new Date('2026-08-16T12:00:00.000Z')

  it('selects open tickets past respond SLA', () => {
    const actions = selectTicketsForSlaEscalation(
      [
        {
          id: 'a',
          status: 'new',
          priority: 'medium',
          sla_respond_by: '2026-08-16T11:00:00.000Z',
          sla_resolve_by: '2026-08-17T12:00:00.000Z',
        },
        {
          id: 'b',
          status: 'new',
          priority: 'low',
          sla_respond_by: '2026-08-16T13:00:00.000Z',
          sla_resolve_by: '2026-08-18T12:00:00.000Z',
        },
      ],
      now,
    )
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      ticketId: 'a',
      breachKind: 'respond',
      fromPriority: 'medium',
      toPriority: 'high',
    })
  })

  it('prefers resolve breach and skips closed', () => {
    const actions = selectTicketsForSlaEscalation(
      [
        {
          id: 'c',
          status: 'in_progress',
          priority: 'high',
          sla_respond_by: '2026-08-16T10:00:00.000Z',
          sla_resolve_by: '2026-08-16T11:00:00.000Z',
        },
        {
          id: 'd',
          status: 'closed',
          priority: 'critical',
          sla_respond_by: '2026-08-16T10:00:00.000Z',
          sla_resolve_by: '2026-08-16T11:00:00.000Z',
        },
      ],
      now,
    )
    expect(actions).toHaveLength(1)
    expect(actions[0]?.breachKind).toBe('resolve')
    expect(actions[0]?.toPriority).toBe('critical')
  })

  it('skips tickets that already responded before respond deadline', () => {
    const actions = selectTicketsForSlaEscalation(
      [
        {
          id: 'e',
          status: 'assigned',
          priority: 'medium',
          sla_respond_by: '2026-08-16T11:00:00.000Z',
          sla_resolve_by: '2026-08-17T12:00:00.000Z',
          first_response_at: '2026-08-16T10:30:00.000Z',
        },
      ],
      now,
    )
    expect(actions).toHaveLength(0)
  })
})
