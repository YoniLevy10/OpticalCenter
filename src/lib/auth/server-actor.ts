import { cookies } from 'next/headers'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import {
  actorIsTech,
  testAuthAllowed,
  type Actor,
} from '@/lib/auth/types'
import { TEST_ACTOR_COOKIE } from '@/lib/auth/demo-session'
import { actorFromProfileId } from '@/lib/auth/load-memberships'
import { resolveTechId } from '@/modules/tickets/tech'

function isProfileUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

/**
 * Resolve the signed-in actor for Server Components / pages.
 *
 * Order:
 * 1) mos_test_actor cookie when test auth is allowed (memory / E2E)
 * 2) Supabase session via cookie-backed user client
 *
 * Membership rows may be loaded with the system client (bootstrap only).
 * Prefer createUserClient() from `@/lib/supabase/scoped` for user-facing
 * ticket reads when authVia === 'supabase_session' (phase 6+).
 */
export async function getServerActor(): Promise<Actor | null> {
  const cookieStore = await cookies()

  if (testAuthAllowed()) {
    const testId = cookieStore.get(TEST_ACTOR_COOKIE)?.value?.trim()
    if (testId && isProfileUuid(testId)) {
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

/**
 * Tech SSR identity: session actor first; query `techId` only for demo/E2E
 * when there is no tech actor yet (middleware may set mos_test_actor on the
 * response while this request still sees a prior HQ cookie).
 */
export function resolveServerTechId(
  actor: Actor | null,
  queryTechId?: string | null,
): string | null {
  if (actor && actorIsTech(actor)) {
    return actor.id
  }

  if (testAuthAllowed()) {
    // Demo / Playwright: allow query (or DEMO_TECH_ID fallback) when cookie
    // actor is missing or is an HQ identity mid-switch.
    return resolveTechId(queryTechId ?? null)
  }

  return actor?.id ?? null
}
