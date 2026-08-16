import type { SupabaseClient } from '@supabase/supabase-js'
import type { Actor } from '@/lib/auth/types'
import { supabaseReady } from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { createUserClient } from '@/lib/supabase/scoped'

/**
 * Prefer user-scoped client (RLS) when the actor authenticated via Supabase
 * session. Falls back to system client for test bearer / memory / missing session.
 */
export async function resolveTicketsSupabase(
  actor: Actor | null | undefined,
  systemLabel = 'tickets_service',
): Promise<{ client: SupabaseClient; mode: 'user' | 'system' } | null> {
  if (!(await supabaseReady())) return null

  if (actor?.authVia === 'supabase_session') {
    try {
      const client = await createUserClient()
      return { client, mode: 'user' }
    } catch {
      /* fall through to system */
    }
  }

  return { client: createSystemClient(systemLabel), mode: 'system' }
}
