import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TEST_ACTOR_COOKIE } from '@/lib/auth/demo-session'

/**
 * Sign out Supabase session and clear demo actor cookie.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // Still clear demo cookie even if Supabase is unavailable.
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(TEST_ACTOR_COOKIE, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  })
  return res
}
