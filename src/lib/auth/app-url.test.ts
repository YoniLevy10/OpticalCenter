import { describe, expect, it, afterEach } from 'vitest'
import { getPublicAppUrl, isLocalhostUrl } from '@/lib/auth/app-url'

describe('app-url', () => {
  const prev = {
    app: process.env.NEXT_PUBLIC_APP_URL,
    vercel: process.env.VERCEL_URL,
    prod: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  }

  afterEach(() => {
    if (prev.app === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = prev.app
    if (prev.vercel === undefined) delete process.env.VERCEL_URL
    else process.env.VERCEL_URL = prev.vercel
    if (prev.prod === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = prev.prod
  })

  it('detects localhost urls', () => {
    expect(isLocalhostUrl('http://localhost:3000')).toBe(true)
    expect(isLocalhostUrl('https://optical-center-rose.vercel.app')).toBe(false)
  })

  it('prefers non-localhost NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://optical-center-rose.vercel.app'
    expect(getPublicAppUrl()).toBe('https://optical-center-rose.vercel.app')
  })

  it('skips localhost env and uses Vercel production url', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'optical-center-rose.vercel.app'
    expect(getPublicAppUrl()).toBe('https://optical-center-rose.vercel.app')
  })
})
