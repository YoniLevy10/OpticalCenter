import { describe, expect, it } from 'vitest'
import {
  SLA_WINDOWS,
  computeSlaTimestamps,
  formatSlaLabelHe,
  isSlaBreached,
} from '@/modules/tickets/sla'

describe('SLA windows', () => {
  it('defines respond+resolve hours per priority', () => {
    expect(SLA_WINDOWS.critical.resolveHours).toBeLessThan(SLA_WINDOWS.high.resolveHours)
    expect(SLA_WINDOWS.high.resolveHours).toBeLessThan(SLA_WINDOWS.medium.resolveHours)
    expect(SLA_WINDOWS.medium.resolveHours).toBeLessThan(SLA_WINDOWS.low.resolveHours)
  })

  it('computeSlaTimestamps uses shorter resolve for critical', () => {
    const now = new Date('2026-08-15T10:00:00.000Z')
    const critical = computeSlaTimestamps('critical', now)
    const medium = computeSlaTimestamps('medium', now)
    expect(new Date(critical.sla_resolve_by).getTime()).toBeLessThan(
      new Date(medium.sla_resolve_by).getTime(),
    )
  })

  it('detects resolve breach', () => {
    expect(
      isSlaBreached({
        status: 'assigned',
        sla_resolve_by: '2026-08-01T00:00:00.000Z',
        now: new Date('2026-08-15T00:00:00.000Z'),
      }),
    ).toBe(true)
  })

  it('formats Hebrew label', () => {
    const label = formatSlaLabelHe({ priority: 'high', status: 'new' })
    expect(label).toContain('גבוה')
    expect(label).toContain('SLA')
  })
})
