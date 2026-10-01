import { describe, expect, it } from 'vitest'
import { isWebPushConfigured } from './send'

describe('push send', () => {
  it('reports VAPID configuration', () => {
    const prevPub = process.env.VAPID_PUBLIC_KEY
    const prevPriv = process.env.VAPID_PRIVATE_KEY
    delete process.env.VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    expect(isWebPushConfigured()).toBe(false)
    process.env.VAPID_PUBLIC_KEY = 'pub'
    process.env.VAPID_PRIVATE_KEY = 'priv'
    expect(isWebPushConfigured()).toBe(true)
    if (prevPub === undefined) delete process.env.VAPID_PUBLIC_KEY
    else process.env.VAPID_PUBLIC_KEY = prevPub
    if (prevPriv === undefined) delete process.env.VAPID_PRIVATE_KEY
    else process.env.VAPID_PRIVATE_KEY = prevPriv
  })
})
