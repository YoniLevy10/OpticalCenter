import { describe, expect, it } from 'vitest'
import { previousMonthRange } from '@/modules/reports/month-range'

describe('previousMonthRange', () => {
  it('returns previous calendar month bounds', () => {
    const range = previousMonthRange(new Date('2026-08-31T10:00:00.000Z'))
    expect(range.month).toBe('2026-07')
    expect(range.from).toBe('2026-07-01')
    expect(range.to).toBe('2026-07-31')
    expect(range.label).toContain('2026-07')
  })

  it('handles January → December of prior year', () => {
    const range = previousMonthRange(new Date('2026-01-15T00:00:00.000Z'))
    expect(range.month).toBe('2025-12')
    expect(range.from).toBe('2025-12-01')
    expect(range.to).toBe('2025-12-31')
  })
})
