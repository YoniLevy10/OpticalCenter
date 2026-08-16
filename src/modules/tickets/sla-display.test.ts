import { describe, expect, it } from 'vitest'
import {
  activeSlaTarget,
  formatAgeHe,
  formatDurationHe,
  getSlaView,
} from '@/modules/tickets/sla-display'
import { buildActivity } from '@/modules/tickets/activity'

const NOW = new Date('2026-08-16T12:00:00.000Z')

describe('formatDurationHe', () => {
  it('renders minutes under an hour', () => {
    expect(formatDurationHe(42 * 60_000)).toBe('42ד׳')
  })

  it('renders h:mm between one hour and a day', () => {
    expect(formatDurationHe(78 * 60_000)).toBe('1:18')
  })

  it('renders whole hours without minutes', () => {
    expect(formatDurationHe(3 * 3600_000)).toBe('3ש׳')
  })

  it('renders days beyond 24h', () => {
    expect(formatDurationHe(28 * 3600_000)).toBe('1ימ׳ 4ש׳')
  })
})

describe('activeSlaTarget', () => {
  it('tracks the respond clock before first response', () => {
    const target = activeSlaTarget({
      status: 'new',
      sla_respond_by: '2026-08-16T13:00:00.000Z',
      sla_resolve_by: '2026-08-16T18:00:00.000Z',
      now: NOW,
    })
    expect(target.phase).toBe('respond')
    expect(target.dueAt).toBe('2026-08-16T13:00:00.000Z')
  })

  it('switches to the resolve clock once work started', () => {
    const target = activeSlaTarget({
      status: 'in_progress',
      sla_respond_by: '2026-08-16T13:00:00.000Z',
      sla_resolve_by: '2026-08-16T18:00:00.000Z',
      now: NOW,
    })
    expect(target.phase).toBe('resolve')
  })

  it('derives a deadline from created_at when stamps are missing', () => {
    const target = activeSlaTarget({
      status: 'new',
      priority: 'critical',
      created_at: '2026-08-16T11:30:00.000Z',
      now: NOW,
    })
    expect(target.phase).toBe('respond')
    expect(target.dueAt).toBe('2026-08-16T12:30:00.000Z')
  })
})

describe('getSlaView', () => {
  it('is neutral with plenty of window left', () => {
    const view = getSlaView({
      status: 'new',
      priority: 'medium',
      sla_respond_by: '2026-08-16T15:00:00.000Z',
      now: NOW,
    })
    expect(view.tone).toBe('neutral')
    expect(view.short).toBe('3ש׳')
  })

  it('turns amber inside the final 20% of the window', () => {
    const view = getSlaView({
      status: 'new',
      priority: 'high',
      sla_respond_by: '2026-08-16T12:20:00.000Z',
      now: NOW,
    })
    expect(view.tone).toBe('warning')
  })

  it('turns critical and reports overdue time after breach', () => {
    const view = getSlaView({
      status: 'assigned',
      priority: 'critical',
      sla_resolve_by: '2026-08-16T11:33:00.000Z',
      now: NOW,
    })
    expect(view.tone).toBe('critical')
    expect(view.short).toContain('באיחור')
    expect(view.short).toContain('27')
  })

  it('stops the clock once resolved', () => {
    const view = getSlaView({
      status: 'resolved',
      priority: 'critical',
      sla_resolve_by: '2026-08-16T11:00:00.000Z',
      now: NOW,
    })
    expect(view.tone).toBe('done')
    expect(view.short).toBe('—')
  })
})

describe('formatAgeHe', () => {
  it('reports fresh tickets as now', () => {
    expect(formatAgeHe('2026-08-16T11:59:30.000Z', NOW)).toBe('עכשיו')
  })

  it('reports relative age', () => {
    expect(formatAgeHe('2026-08-16T09:00:00.000Z', NOW)).toBe('לפני 3ש׳')
  })
})

describe('buildActivity', () => {
  it('merges messages and events into one ascending chronology', () => {
    const items = buildActivity(
      [
        { id: 'm1', direction: 'inbound', body: 'המזגן לא עובד', created_at: '2026-08-16T10:00:00.000Z' },
        { id: 'm2', direction: 'outbound', body: 'התקבל', created_at: '2026-08-16T10:01:00.000Z' },
      ],
      [
        { id: 'e1', event_type: 'created', created_at: '2026-08-16T10:00:30.000Z' },
        {
          id: 'e2',
          event_type: 'status_changed',
          created_at: '2026-08-16T11:00:00.000Z',
          payload: { from: 'new', to: 'assigned' },
        },
      ],
    )

    expect(items).toHaveLength(4)
    expect(items.map((i) => i.id)).toEqual(['m-m1', 'e-e1', 'm-m2', 'e-e2'])
    expect(items[0].kind).toBe('message_in')
    expect(items[3].transition?.from).toBe('חדש')
    expect(items[3].transition?.to).toBe('משויך')
  })

  it('falls back to from_status/to_status payload shape', () => {
    const items = buildActivity(
      [],
      [
        {
          id: 'e1',
          event_type: 'status_changed',
          created_at: '2026-08-16T11:00:00.000Z',
          payload: { from_status: 'new', to_status: 'in_progress' },
        },
      ],
    )
    expect(items[0].transition?.from).toBe('חדש')
    expect(items[0].transition?.to).toBe('בטיפול')
  })

  it('survives empty inputs', () => {
    expect(buildActivity()).toEqual([])
  })
})
