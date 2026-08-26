import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

const TEST_ACTOR_COOKIE = 'mos_test_actor'
const HQ_ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TECH_A = '11111111-1111-4111-8111-111111111111'

function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/**
 * Demo cookie injection + Supabase session refresh + page gate for /ops|/tech.
 * Matcher excludes /api/* — API auth stays in requireActor.
 * Keep this file free of node:crypto imports (Edge middleware).
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const demo = shouldAllowDemoEntry()

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // --- Demo / E2E: inject mos_test_actor when missing ---
  if (demo) {
    const existing = request.cookies.get(TEST_ACTOR_COOKIE)?.value

    if (pathname.startsWith('/ops')) {
      if (!existing) {
        response.cookies.set(TEST_ACTOR_COOKIE, HQ_ADMIN, {
          path: '/',
          sameSite: 'lax',
        })
      }
    }

    if (pathname.startsWith('/tech')) {
      const techId =
        searchParams.get('techId')?.trim() ||
        process.env.DEMO_TECH_ID?.trim() ||
        TECH_A
      if (
        /^[0-9a-f-]{36}$/i.test(techId) &&
        (!existing || searchParams.has('techId'))
      ) {
        response.cookies.set(TEST_ACTOR_COOKIE, techId, {
          path: '/',
          sameSite: 'lax',
        })
      }
    }

    // Demo mode skips real session gate (Playwright sets FORCE_MEMORY + ALLOW_TEST_AUTH).
    return response
  }

  // --- Production-ish: refresh Supabase cookies + gate pages ---
  let user: { id: string } | null = null

  if (supabaseConfigured()) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      user = null
    }
  }

  // Test actor cookie is demo-only — never bypass session gate in production.
  const testActor = demo ? request.cookies.get(TEST_ACTOR_COOKIE)?.value : undefined
  if (!user && !testActor) {
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    login.search = ''
    login.searchParams.set(
      'next',
      `${pathname}${request.nextUrl.search || ''}`,
    )
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: ['/ops/:path*', '/tech/:path*', '/store/:path*'],
}
