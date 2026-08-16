import { createSystemClient } from '@/lib/supabase/system'
import type { Actor } from '@/lib/auth/types'
import { memListMemberships, memGetProfile } from '@/lib/auth/memory-memberships'
import { supabaseReady } from '@/lib/data/memory-store'

/** Load memberships for a profile (system client OK — membership bootstrap). */
export async function loadMemberships(profileId: string): Promise<Actor['memberships']> {
  if (!(await supabaseReady())) {
    return memListMemberships(profileId)
  }
  const supabase = createSystemClient('auth_memberships')
  const { data, error } = await supabase
    .from('memberships')
    .select(
      'id, profile_id, organization_id, role, country_id, region_id, store_id',
    )
    .eq('profile_id', profileId)
  if (error) throw new Error(error.message)
  return (data ?? []) as Actor['memberships']
}

export async function loadProfile(profileId: string): Promise<{
  id: string
  email: string | null
  full_name: string | null
}> {
  if (!(await supabaseReady())) {
    const mem = memGetProfile(profileId)
    return {
      id: profileId,
      email: mem?.email ?? null,
      full_name: mem?.full_name ?? null,
    }
  }
  const supabase = createSystemClient('auth_memberships')
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', profileId)
    .maybeSingle()
  return data ?? { id: profileId, email: null, full_name: null }
}

export async function actorFromProfileId(
  profileId: string,
  authVia: Actor['authVia'],
): Promise<Actor> {
  const profile = await loadProfile(profileId)
  const memberships = await loadMemberships(profileId)
  return {
    id: profileId,
    email: profile.email,
    full_name: profile.full_name,
    memberships,
    authVia,
  }
}
