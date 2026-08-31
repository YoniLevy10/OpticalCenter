import { describe, expect, it, vi } from 'vitest'

/** Mirrors middleware timeout helper (kept local to Edge bundle). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`auth_lookup_timeout_${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

describe('middleware auth lookup timeout', () => {
  it('resolves when auth returns quickly', async () => {
    const result = await withTimeout(Promise.resolve({ id: 'u1' }), 50)
    expect(result).toEqual({ id: 'u1' })
  })

  it('rejects when auth hangs past the budget', async () => {
    vi.useFakeTimers()
    const hanging = new Promise<{ id: string }>(() => {
      /* never settles */
    })
    const pending = withTimeout(hanging, 25)
    const assertion = expect(pending).rejects.toThrow(/auth_lookup_timeout_25ms/)
    await vi.advanceTimersByTimeAsync(30)
    await assertion
    vi.useRealTimers()
  })
})
