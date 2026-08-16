import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Trusted system operations only (webhook, cron, seed, readiness probe).
 * Never use for end-user ticket reads in production paths.
 * Safe to import from shared modules (no next/headers, no node:crypto).
 */
export function createSystemClient(reason: string): SupabaseClient {
  if (!reason?.trim()) {
    throw new Error('createSystemClient requires an explicit reason')
  }
  return createAdminClient()
}
