/**
 * Public app origin for Magic Link / OTP redirects and outbound links.
 * Never fall back to localhost when running on Vercel production.
 */
export function getPublicAppUrl(request?: Request): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ''
  ).replace(/\/$/, '')

  if (fromEnv && !isLocalhostUrl(fromEnv)) {
    return fromEnv
  }

  if (request) {
    const origin = requestOrigin(request)
    if (origin && !isLocalhostUrl(origin)) return origin
  }

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    ''
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return `https://${host}`
  }

  if (fromEnv) return fromEnv
  return 'http://localhost:3000'
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url.includes('://') ? url : `http://${url}`)
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '0.0.0.0'
    )
  } catch {
    return /localhost|127\.0\.0\.1/.test(url)
  }
}

function requestOrigin(request: Request): string | null {
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!host) return null
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`.replace(/\/$/, '')
}

/** Client-side callback URL — always the page the user is on. */
export function clientAuthCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  return `${getPublicAppUrl()}/auth/callback`
}
