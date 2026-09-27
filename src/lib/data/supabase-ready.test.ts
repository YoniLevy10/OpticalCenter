import { afterEach, describe, expect, it, vi } from 'vitest'

describe('supabaseReady cache', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('returns false immediately when FORCE_MEMORY without probing', async () => {
    vi.stubEnv('MAINTAINOS_FORCE_MEMORY', '1')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

    const { supabaseReady, resetSupabaseReadyCache } = await import(
      '@/lib/data/memory-store'
    )
    resetSupabaseReadyCache()
    await expect(supabaseReady()).resolves.toBe(false)
    await expect(supabaseReady()).resolves.toBe(false)
  })

  it('returns false when env is missing', async () => {
    vi.stubEnv('MAINTAINOS_FORCE_MEMORY', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    const { supabaseReady, resetSupabaseReadyCache } = await import(
      '@/lib/data/memory-store'
    )
    resetSupabaseReadyCache()
    await expect(supabaseReady()).resolves.toBe(false)
  })
})
