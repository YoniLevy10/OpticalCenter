import { describe, expect, it } from 'vitest'
import { isNightHour, resolveDark } from './theme'

describe('isNightHour', () => {
  it('treats 19–06 as night with wrap-around window', () => {
    expect(isNightHour(19)).toBe(true)
    expect(isNightHour(23)).toBe(true)
    expect(isNightHour(0)).toBe(true)
    expect(isNightHour(6)).toBe(true)
    expect(isNightHour(7)).toBe(false)
    expect(isNightHour(12)).toBe(false)
    expect(isNightHour(18)).toBe(false)
  })
})

describe('resolveDark', () => {
  it('honors explicit light/dark', () => {
    expect(resolveDark('light', 23)).toBe(false)
    expect(resolveDark('dark', 12)).toBe(true)
  })

  it('uses clock in auto mode', () => {
    expect(resolveDark('auto', 21)).toBe(true)
    expect(resolveDark('auto', 10)).toBe(false)
  })
})
