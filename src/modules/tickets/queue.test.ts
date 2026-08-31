import { describe, expect, it } from 'vitest'
import {
  applyQueue,
  needsAttention,
  parseQueueParams,
  queueCounts,
  queueHref,
  type QueueTicket,
} from '@/modules/tickets/queue'

const NOW = new Date('2026-08-16T12:00:00.000Z')

function ticket(over: Partial<QueueTicket> & { id: string }): QueueTicket {
  return {
    status: 'new',
    priority: 'medium',
    description: 'תקלה',
    created_at: '2026-08-16T10:00:00.000Z',
    ...over,
  }
}

const BREACHED = ticket({
  id: 'breached',
  status: 'assigned',
  priority: 'high',
  assigned_to: 'tech-1',
  sla_resolve_by: '2026-08-16T11:00:00.000Z',
})
const CRITICAL = ticket({
  id: 'critical',
  status: 'in_progress',
  priority: 'critical',
  assigned_to: 'tech-1',
  sla_resolve_by: '2026-08-16T18:00:00.000Z',
})
const UNASSIGNED = ticket({ id: 'unassigned', status: 'new', priority: 'low' })
const CALM = ticket({
  id: 'calm',
  status: 'in_progress',
  priority: 'medium',
  assigned_to: 'tech-2',
  sla_resolve_by: '2026-08-16T20:00:00.000Z',
})
const DONE = ticket({ id: 'done', status: 'resolved', priority: 'high' })

const ALL = [CALM, DONE, UNASSIGNED, CRITICAL, BREACHED]

describe('needsAttention', () => {
  it('flags breach, critical and unowned open work', () => {
    expect(needsAttention(BREACHED, NOW)).toBe(true)
    expect(needsAttention(CRITICAL, NOW)).toBe(true)
    expect(needsAttention(UNASSIGNED, NOW)).toBe(true)
  })

  it('leaves calm owned work alone', () => {
    expect(needsAttention(CALM, NOW)).toBe(false)
  })

  it('never flags finished work', () => {
    expect(needsAttention(DONE, NOW)).toBe(false)
  })
})

describe('applyQueue — view and filters are orthogonal', () => {
  it('priority filter does NOT discard the view (the old SEGMENTS bug)', () => {
    const result = applyQueue(
      ALL,
      { view: 'open', priority: 'critical', sort: 'urgency' },
      NOW,
    )
    expect(result.map((t) => t.id)).toEqual(['critical'])
  })

  it('combines status and view independently', () => {
    const result = applyQueue(
      ALL,
      { view: 'open', status: 'in_progress', sort: 'urgency' },
      NOW,
    )
    expect(result.map((t) => t.id).sort()).toEqual(['calm', 'critical'])
  })

  it('unassigned view only returns open unowned work', () => {
    const result = applyQueue(ALL, { view: 'unassigned', sort: 'urgency' }, NOW)
    expect(result.map((t) => t.id)).toEqual(['unassigned'])
  })

  it('sorts breached before critical before the rest', () => {
    const result = applyQueue(ALL, { view: 'open', sort: 'urgency' }, NOW)
    expect(result[0].id).toBe('breached')
    expect(result[1].id).toBe('critical')
  })

  it('sorts by soonest deadline under sla sort', () => {
    const result = applyQueue(ALL, { view: 'open', sort: 'sla' }, NOW)
    expect(result[0].id).toBe('breached')
  })

  it('searches number, store and description', () => {
    const withStore = [
      ticket({
        id: 'x',
        display_number: 'OC-18342',
        description: 'המזגן הראשי לא עובד',
        stores: { code: '172', name: 'תל אביב אבן גבירול' },
      }),
      CALM,
    ]
    expect(
      applyQueue(withStore, { view: 'all', q: '18342', sort: 'newest' }, NOW),
    ).toHaveLength(1)
    expect(
      applyQueue(withStore, { view: 'all', q: 'גבירול', sort: 'newest' }, NOW),
    ).toHaveLength(1)
    expect(
      applyQueue(withStore, { view: 'all', q: 'מזגן', sort: 'newest' }, NOW),
    ).toHaveLength(1)
  })
  it('hides demo tickets by default', () => {
    const withDemo = [
      ...ALL,
      ticket({ id: 'demo-1', source: 'demo', priority: 'critical' }),
    ]
    const hidden = applyQueue(withDemo, { view: 'all', sort: 'urgency' }, NOW)
    expect(hidden.map((t) => t.id)).not.toContain('demo-1')
    const shown = applyQueue(
      withDemo,
      { view: 'all', sort: 'urgency', includeDemo: true },
      NOW,
    )
    expect(shown.map((t) => t.id)).toContain('demo-1')
  })
})

describe('queueCounts', () => {
  it('counts only open work', () => {
    const counts = queueCounts(ALL, NOW)
    expect(counts.open).toBe(4)
    expect(counts.breached).toBe(1)
    expect(counts.critical).toBe(1)
    expect(counts.unassigned).toBe(1)
  })
})

describe('queueHref / parseQueueParams', () => {
  it('omits defaults and round-trips the rest', () => {
    expect(queueHref({ view: 'all', sort: 'urgency' })).toBe('/ops/tickets')
    const href = queueHref(
      { view: 'open', sort: 'sla', q: 'מזגן' },
      { priority: 'critical' },
    )
    expect(href).toContain('view=open')
    expect(href).toContain('sort=sla')
    expect(href).toContain('priority=critical')
  })

  it('falls back to the all view', () => {
    expect(parseQueueParams({}).view).toBe('all')
    expect(parseQueueParams({ view: 'nonsense' }).view).toBe('all')
    expect(parseQueueParams({ view: 'resolved' }).view).toBe('resolved')
  })

  it('filters mine and urgent views', () => {
    const mine = applyQueue(
      ALL,
      { view: 'mine', sort: 'urgency', actorId: 'tech-1' },
      NOW,
    )
    expect(mine.map((t) => t.id).sort()).toEqual(['breached', 'critical'])

    const urgent = applyQueue(ALL, { view: 'urgent', sort: 'urgency' }, NOW)
    expect(urgent.map((t) => t.id)).toEqual(['breached', 'critical'])
  })
})
