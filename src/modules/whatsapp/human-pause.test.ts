import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  HUMAN_PAUSE_WINDOW_MS,
  formatPauseUntilHe,
  humanPauseUntilIso,
  isHumanPauseActive,
} from './human-pause'

describe('human pause window', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is inactive when takeover is false', () => {
    expect(
      isHumanPauseActive({
        human_takeover: false,
        human_takeover_until: humanPauseUntilIso(),
      }),
    ).toBe(false)
  })

  it('treats legacy permanent takeover (no until) as inactive', () => {
    expect(
      isHumanPauseActive({
        human_takeover: true,
        human_takeover_until: null,
      }),
    ).toBe(false)
  })

  it('is active inside the window and inactive after expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-31T10:00:00.000Z'))
    const until = humanPauseUntilIso()
    expect(Date.parse(until) - Date.now()).toBe(HUMAN_PAUSE_WINDOW_MS)
    expect(
      isHumanPauseActive({ human_takeover: true, human_takeover_until: until }),
    ).toBe(true)

    vi.setSystemTime(new Date('2026-08-31T10:31:00.000Z'))
    expect(
      isHumanPauseActive({ human_takeover: true, human_takeover_until: until }),
    ).toBe(false)
  })

  it('formats until time in Hebrew locale', () => {
    const label = formatPauseUntilHe('2026-08-31T10:30:00.000Z')
    expect(label).toBeTruthy()
  })
})
