import { createSystemClient } from '@/lib/supabase/system'
import { normalizeEmail, isPilotEmail } from '@/lib/auth/pilot-users'
import { memListUsers } from '@/lib/auth/memory-memberships'
import { supabaseReady } from '@/lib/data/memory-store'

/**
 * Who may sign in.
 *
 * 1. Explicit allowlist: APPROVED_LOGIN_EMAILS (comma-separated)
 * 2. Pilot owner emails (OpsBrain…)
 * 3. Profile that already has a membership (admin-provisioned user)
 *
 * Open Google / magic-link for arbitrary Gmail addresses is rejected.
 */
export function approvedLoginEmailsFromEnv(): string[] {
  const raw = process.env.APPROVED_LOGIN_EMAILS?.trim()
  if (!raw) return []
  return raw
    .split(/[,;\s]+/)
    .map((e) => normalizeEmail(e))
    .filter(Boolean)
}

export function isExplicitlyApprovedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const key = normalizeEmail(email)
  if (isPilotEmail(key)) return true
  return approvedLoginEmailsFromEnv().includes(key)
}

/** True when the email may complete login (allowlist or provisioned membership). */
export async function isApprovedLoginEmail(
  email: string | null | undefined,
): Promise<boolean> {
  if (!email) return false
  const key = normalizeEmail(email)
  if (isExplicitlyApprovedEmail(key)) return true

  if (!(await supabaseReady())) {
    return memListUsers().some(
      (u) =>
        u.email &&
        normalizeEmail(u.email) === key &&
        u.memberships.length > 0,
    )
  }

  try {
    const supabase = createSystemClient('login_allowlist')
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', key)
      .maybeSingle()
    if (!profile?.id) return false
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('profile_id', profile.id)
      .limit(1)
      .maybeSingle()
    return Boolean(membership?.id)
  } catch {
    return false
  }
}
