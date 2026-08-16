import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requestPasswordlessLogin } from '@/lib/auth/request-login'
import { ensurePilotAccessForAuthUser } from '@/lib/auth/seed-pilot-user'
import { resolveHomePath } from '@/lib/auth/home-path'
import { loadMemberships } from '@/lib/auth/load-memberships'
import { normalizeEmail } from '@/lib/auth/pilot-users'
import {
  checkRateLimit,
  clientIpFromRequest,
} from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  email: z.string().email(),
})

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().min(4).max(12),
})

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

/**
 * Passwordless + password login that sets Supabase session cookies on this host.
 *
 * Modes:
 * - POST /api/auth/request-login              → send magic/OTP email
 * - POST /api/auth/request-login?mode=verify  → email + OTP
 * - POST /api/auth/request-login?mode=password
 */
export async function POST(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode') || 'request'
  const ip = clientIpFromRequest(request)
  const limited = checkRateLimit(`auth-login:${ip}`, 12, 60_000)
  if (!limited.allowed) {
    return NextResponse.json(
      { error: 'יותר מדי ניסיונות — נסו שוב בעוד דקה' },
      { status: 429 },
    )
  }

  let json: unknown = {}
  try {
    json = await request.json()
  } catch {
    json = {}
  }

  try {
    if (mode === 'password') return await handlePassword(json)
    if (mode === 'verify') return await handleVerify(json)
    return await handleRequest(request, json)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'auth_failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handleRequest(request: Request, json: unknown) {
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  const result = await requestPasswordlessLogin(parsed.data.email, request)
  return NextResponse.json({
    ok: true,
    email: result.email,
    delivery: result.delivery,
    deliveryDetail: result.deliveryDetail,
    next: 'otp',
    hint:
      result.delivery === 'email_provider'
        ? 'נשלחו קישור וקוד למייל'
        : 'בדקו את המייל. אם הקישור מוביל ל־localhost — הזינו את הקוד מהמייל (אם מופיע) או התחברו עם סיסמה.',
  })
}

async function handleVerify(json: unknown) {
  const parsed = verifySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const email = normalizeEmail(parsed.data.email)
  const token = parsed.data.token.trim()
  const supabase = await createRouteSupabase()

  let { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'magiclink',
  })
  if (error || !data.user) {
    const retry = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    data = retry.data
    error = retry.error
  }
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'קוד לא תקין' },
      { status: 401 },
    )
  }

  return NextResponse.json(await finishLoginPayload(data.user))
}

async function handlePassword(json: unknown) {
  const parsed = passwordSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const email = normalizeEmail(parsed.data.email)
  const supabase = await createRouteSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'אימייל או סיסמה שגויים' },
      { status: 401 },
    )
  }

  return NextResponse.json(await finishLoginPayload(data.user))
}

async function finishLoginPayload(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  await ensurePilotAccessForAuthUser({
    userId: user.id,
    email: user.email,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
  })
  const memberships = await loadMemberships(user.id)
  const home = resolveHomePath({ memberships })
  return { ok: true as const, home }
}

async function createRouteSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called in a context where cookies are read-only.
          }
        },
      },
    },
  )
}

export async function GET() {
  return NextResponse.json({
    usage: {
      request: 'POST /api/auth/request-login',
      verify: 'POST /api/auth/request-login?mode=verify',
      password: 'POST /api/auth/request-login?mode=password',
    },
  })
}
