import { describe, expect, it } from 'vitest'
import {
  selectUnassignedTimeouts,
  unassignedTimeoutMsFromEnv,
} from './unassigned-timeout'

describe('selectUnassignedTimeouts', () => {
  const now = new Date('2026-08-31T12:00:00.000Z').getTime()
  const threshold = 2 * 60 * 60 * 1000

  it('selects open unassigned past threshold', () => {
    const selected = selectUnassignedTimeouts(
      [
        {
          id: '1',
          status: 'new',
          assigned_to: null,
          created_at: '2026-08-31T09:00:00.000Z',
        },
        {
          id: '2',
          status: 'new',
          assigned_to: null,
          created_at: '2026-08-31T11:30:00.000Z',
        },
        {
          id: '3',
          status: 'new',
          assigned_to: 'tech-a',
          created_at: '2026-08-31T08:00:00.000Z',
        },
        {
          id: '4',
          status: 'closed',
          assigned_to: null,
          created_at: '2026-08-31T08:00:00.000Z',
        },
      ],
      threshold,
      now,
    )
    expect(selected.map((t) => t.id)).toEqual(['1'])
  })

  it('reads hours from env with fallback', () => {
    const prev = process.env.UNASSIGNED_TIMEOUT_HOURS
    process.env.UNASSIGNED_TIMEOUT_HOURS = '4'
    expect(unassignedTimeoutMsFromEnv()).toBe(4 * 60 * 60 * 1000)
    process.env.UNASSIGNED_TIMEOUT_HOURS = 'bad'
    expect(unassignedTimeoutMsFromEnv()).toBe(2 * 60 * 60 * 1000)
    if (prev === undefined) delete process.env.UNASSIGNED_TIMEOUT_HOURS
    else process.env.UNASSIGNED_TIMEOUT_HOURS = prev
  })
})
