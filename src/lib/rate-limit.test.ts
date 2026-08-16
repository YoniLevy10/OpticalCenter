import { describe, expect, it } from 'vitest'
import { checkRateLimit } from './rate-limit'

describe('checkRateLimit', () => {
  it('allows up to limit then blocks', () => {
    const key = `test-${Math.random()}`
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true)
    }
    expect(checkRateLimit(key, 5, 60_000).allowed).toBe(false)
  })
})
