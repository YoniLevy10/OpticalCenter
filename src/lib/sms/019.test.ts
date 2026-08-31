import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  is019SmsConfigured,
  send019Sms,
  to019LocalPhone,
} from './019'

describe('to019LocalPhone', () => {
  it('normalizes IL mobiles from E.164 / local', () => {
    expect(to019LocalPhone('972548102688')).toBe('0548102688')
    expect(to019LocalPhone('+972-54-810-2688')).toBe('0548102688')
    expect(to019LocalPhone('0548102688')).toBe('0548102688')
    expect(to019LocalPhone('548102688')).toBe('0548102688')
  })

  it('rejects non-mobile / short numbers', () => {
    expect(to019LocalPhone('97221234567')).toBeNull()
    expect(to019LocalPhone('123')).toBeNull()
    expect(to019LocalPhone('')).toBeNull()
  })
})

describe('is019SmsConfigured', () => {
  const keys = [
    'SMS_019_USERNAME',
    'SMS_019_SENDER',
    'SMS_019_TOKEN',
    'SMS_019_BEARER_TOKEN',
    'SMS_019_PASSWORD',
  ] as const

  afterEach(() => {
    for (const k of keys) delete process.env[k]
  })

  it('requires username + sender + token or password', () => {
    expect(is019SmsConfigured()).toBe(false)
    process.env.SMS_019_USERNAME = 'u'
    process.env.SMS_019_SENDER = 'MaintainOS'
    expect(is019SmsConfigured()).toBe(false)
    process.env.SMS_019_TOKEN = 'tok'
    expect(is019SmsConfigured()).toBe(true)
  })
})

describe('send019Sms', () => {
  const keys = [
    'SMS_019_USERNAME',
    'SMS_019_SENDER',
    'SMS_019_TOKEN',
    'SMS_019_PASSWORD',
    'SMS_019_DRY_RUN',
    'SMS_019_TEST',
  ] as const

  beforeEach(() => {
    for (const k of keys) delete process.env[k]
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    for (const k of keys) delete process.env[k]
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('skips when not configured', async () => {
    const r = await send019Sms({ to: '0548102688', message: 'hi' })
    expect(r.ok).toBe(false)
    expect(r.skipped).toBe('not_configured')
  })

  it('dry-runs without HTTP when SMS_019_DRY_RUN=1', async () => {
    process.env.SMS_019_USERNAME = 'u'
    process.env.SMS_019_SENDER = 'MaintainOS'
    process.env.SMS_019_TOKEN = 'tok'
    process.env.SMS_019_DRY_RUN = '1'
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const r = await send019Sms({
      to: '972548102688',
      message: 'שויכת לתקלה OC-1',
    })
    expect(r.ok).toBe(true)
    expect(r.dryRun).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('POSTs JSON with Bearer token and treats status 0 as success', async () => {
    process.env.SMS_019_USERNAME = 'u'
    process.env.SMS_019_SENDER = 'MaintainOS'
    process.env.SMS_019_TOKEN = 'tok'

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 0 }),
    })
    vi.stubGlobal('fetch', fetchSpy)

    const r = await send019Sms({
      to: '0548102688',
      message: 'שויכת לתקלה OC-9\nhttps://example.com/tech/abc',
      meta: { ticketId: 'abc' },
    })

    expect(r.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://019sms.co.il/api')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer tok',
    )
    const body = JSON.parse(String(init.body)) as {
      sms: {
        user: { username: string }
        source: string
        destinations: { phone: string }
        message: string
      }
    }
    expect(body.sms.user.username).toBe('u')
    expect(body.sms.source).toBe('MaintainOS')
    expect(body.sms.destinations.phone).toBe('0548102688')
    expect(body.sms.message).toContain('OC-9')
  })
})
