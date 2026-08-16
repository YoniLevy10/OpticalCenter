import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createSystemClient } from '@/lib/supabase/system'
import {
  AuthError,
  type Actor,
  parseTestBearer,
  testAuthAllowed,
} from '@/lib/auth/types'
import { memListMemberships, memGetProfile } from '@/lib/auth/memory-memberships'
import { supabaseReady } from '@/lib/data/memory-store'

async function loadMemberships(profileId: string) {
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

async function loadProfile(profileId: string) {
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

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (rawKey === name) {
      try {
        return decodeURIComponent(rest.join('=') || '')
      } catch {
        return rest.join('=') || null
      }
    }
  }
  return null
}

/**
 * Resolve authenticated actor from:
 * 1) Test bearer / mos_test_actor cookie (non-production / FORCE_MEMORY QA only)
 * 2) Supabase session cookies (production path)
 */
export async function getActorFromRequest(request: Request): Promise<Actor | null> {
  if (testAuthAllowed()) {
    const testId =
      parseTestBearer(request.headers.get('authorization')) ||
      cookieValue(request, 'mos_test_actor')
    if (testId) {
      const profile = await loadProfile(testId)
      const memberships = await loadMemberships(testId)
      return {
        id: testId,
        email: profile.email,
        full_name: profile.full_name,
        memberships,
        authVia: 'test_bearer',
      }
    }
  }

  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    const memberships = await loadMemberships(data.user.id)
    return {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name ?? null,
      memberships,
      authVia: 'supabase_session',
    }
  } catch {
    return null
  }
}

export async function requireActor(request: Request): Promise<Actor> {
  const actor = await getActorFromRequest(request)
  if (!actor) throw new AuthError('נדרשת התחברות', 401)
  if (actor.memberships.length === 0) {
    throw new AuthError('אין הרשאות פעילות למשתמש', 403)
  }
  return actor
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  const message = err instanceof Error ? err.message : 'שגיאת הרשאות'
  return NextResponse.json({ error: message }, { status: 500 })
}
