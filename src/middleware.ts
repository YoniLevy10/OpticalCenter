import { NextResponse, type NextRequest } from 'next/server'

const TEST_ACTOR_COOKIE = 'mos_test_actor'
const HQ_ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TECH_A = '11111111-1111-4111-8111-111111111111'

function testAuthEnabled() {
  return (
    process.env.MAINTAINOS_ALLOW_TEST_AUTH === '1' ||
    process.env.MAINTAINOS_FORCE_MEMORY === '1'
  )
}

/**
 * Demo/E2E only: attach mos_test_actor cookie for ops/tech UI mutations.
 * Production uses Supabase session cookies instead.
 * Keep this file free of node:crypto imports (Edge middleware).
 */
export function middleware(request: NextRequest) {
  if (!testAuthEnabled()) {
    return NextResponse.next()
  }

  const { pathname, searchParams } = request.nextUrl
  const res = NextResponse.next()
  const existing = request.cookies.get(TEST_ACTOR_COOKIE)?.value

  if (pathname.startsWith('/ops')) {
    if (!existing) {
      res.cookies.set(TEST_ACTOR_COOKIE, HQ_ADMIN, {
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
      res.cookies.set(TEST_ACTOR_COOKIE, techId, {
        path: '/',
        sameSite: 'lax',
      })
    }
  }

  return res
}

export const config = {
  matcher: ['/ops/:path*', '/tech/:path*'],
}
