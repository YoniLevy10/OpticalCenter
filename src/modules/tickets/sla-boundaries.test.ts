import { describe, expect, it } from 'vitest'
import {
  SLA_WINDOWS,
  computeSlaTimestamps,
  getSlaBreachKind,
  formatSlaLabelHe,
  isSlaBreached,
} from '@/modules/tickets/sla'
import type { TicketPriority } from '@/modules/tickets/constants'

describe('SLA windows & breach boundaries', () => {
  const priorities: TicketPriority[] = ['critical', 'high', 'medium', 'low']

  for (const p of priorities) {
    it(`generates respond/resolve deadlines for ${p}`, () => {
      const now = new Date('2026-01-01T12:00:00.000Z')
      const sla = computeSlaTimestamps(p, now)
      const w = SLA_WINDOWS[p]
      expect(new Date(sla.sla_respond_by).getTime()).toBe(
        now.getTime() + w.respondHours * 3600_000,
      )
      expect(new Date(sla.sla_resolve_by).getTime()).toBe(
        now.getTime() + w.resolveHours * 3600_000,
      )
      expect(formatSlaLabelHe({ priority: p })).toMatch(/SLA/)
    })
  }

  it('breach boundaries around resolve SLA', () => {
    const sla_resolve_by = '2026-01-01T12:00:00.000Z'
    const base = {
      status: 'in_progress',
      sla_resolve_by,
      resolved_at: null as string | null,
    }
    expect(
      getSlaBreachKind({
        ...base,
        now: new Date('2026-01-01T11:59:59.000Z'),
      }),
    ).toBe('none')
    // exact timestamp: implementation uses `<` so exact is not breached
    expect(
      getSlaBreachKind({
        ...base,
        now: new Date('2026-01-01T12:00:00.000Z'),
      }),
    ).toBe('none')
    expect(
      getSlaBreachKind({
        ...base,
        now: new Date('2026-01-01T12:00:01.000Z'),
      }),
    ).toBe('resolve')
  })

  it('resolved before SLA is not breached; after still ok once resolved', () => {
    const sla_resolve_by = '2026-01-01T12:00:00.000Z'
    expect(
      isSlaBreached({
        status: 'resolved',
        sla_resolve_by,
        resolved_at: '2026-01-01T11:00:00.000Z',
        now: new Date('2026-01-01T13:00:00.000Z'),
      }),
    ).toBe(false)
    expect(
      isSlaBreached({
        status: 'resolved',
        sla_resolve_by,
        resolved_at: '2026-01-01T13:00:00.000Z',
        now: new Date('2026-01-01T14:00:00.000Z'),
      }),
    ).toBe(false)
  })

  it('respond breach when still new past respond deadline', () => {
    expect(
      getSlaBreachKind({
        status: 'new',
        sla_respond_by: '2026-01-01T12:00:00.000Z',
        sla_resolve_by: '2026-01-02T12:00:00.000Z',
        now: new Date('2026-01-01T12:00:01.000Z'),
      }),
    ).toBe('respond')
  })
})
