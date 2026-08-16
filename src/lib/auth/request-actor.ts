import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  AuthError,
  type Actor,
  parseTestBearer,
  testAuthAllowed,
} from '@/lib/auth/types'
import { actorFromProfileId } from '@/lib/auth/load-memberships'

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
      return actorFromProfileId(testId, 'test_bearer')
    }
  }

  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    const actor = await actorFromProfileId(data.user.id, 'supabase_session')
    return {
      ...actor,
      email: data.user.email ?? actor.email,
      full_name:
        (data.user.user_metadata?.full_name as string | undefined) ??
        actor.full_name,
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
