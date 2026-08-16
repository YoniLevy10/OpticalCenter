import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSystemClient } from '@/lib/supabase/system'
import { resolveHomePath } from '@/lib/auth/home-path'
import type { Actor } from '@/lib/auth/types'
import { memListMemberships } from '@/lib/auth/memory-memberships'
import { ensurePilotAccessForAuthUser } from '@/lib/auth/seed-pilot-user'
import { supabaseReady } from '@/lib/data/memory-store'

async function loadMemberships(profileId: string): Promise<Actor['memberships']> {
  if (!(await supabaseReady())) {
    return memListMemberships(profileId)
  }
  const supabase = createSystemClient('auth_callback_memberships')
  const { data, error } = await supabase
    .from('memberships')
    .select(
      'id, profile_id, organization_id, role, country_id, region_id, store_id',
    )
    .eq('profile_id', profileId)
  if (error) throw new Error(error.message)
  return (data ?? []) as Actor['memberships']
}

/**
 * Magic Link / OAuth code exchange. Redirects by role home.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=auth`)
    }

    // Known pilot emails get profile + global_admin if missing
    await ensurePilotAccessForAuthUser({
      userId: user.id,
      email: user.email,
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    })

    const memberships = await loadMemberships(user.id)
    const home = resolveHomePath({ memberships })
    return NextResponse.redirect(`${origin}${home}`)
  } catch {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }
}
