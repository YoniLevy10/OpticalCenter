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

type EmailOtpType =
  | 'magiclink'
  | 'email'
  | 'signup'
  | 'invite'
  | 'recovery'
  | 'email_change'

function asOtpType(value: string | null): EmailOtpType {
  if (
    value === 'magiclink' ||
    value === 'email' ||
    value === 'signup' ||
    value === 'invite' ||
    value === 'recovery' ||
    value === 'email_change'
  ) {
    return value
  }
  return 'magiclink'
}

/**
 * Magic Link / OTP exchange.
 * Supports:
 * - ?code=… (PKCE)
 * - ?token_hash=…&type=magiclink (bypasses broken Site URL redirects)
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = asOtpType(url.searchParams.get('type'))
  const origin = url.origin

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  try {
    const supabase = await createClient()

    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (error) {
        return NextResponse.redirect(`${origin}/login?error=auth`)
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return NextResponse.redirect(`${origin}/login?error=auth`)
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=auth`)
    }

    await ensurePilotAccessForAuthUser({
      userId: user.id,
      email: user.email,
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    })

    const memberships = await loadMemberships(user.id)
  const home = resolveHomePath({ memberships })
  const nextPath = url.searchParams.get('next')
  const safeNext =
    nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null
  return NextResponse.redirect(`${origin}${safeNext ?? home}`)
  } catch {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }
}
