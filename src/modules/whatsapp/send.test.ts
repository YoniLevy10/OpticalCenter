import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isMetaPhoneNumberId,
  normalizeWhatsAppRecipient,
  resolveWhatsAppPhoneNumberId,
} from './phone-number-id'
import { sendWhatsAppText } from './send'

describe('phone-number-id', () => {
  const prevPhone = process.env.WHATSAPP_PHONE_NUMBER_ID
  const prevPublic = process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID

  afterEach(() => {
    if (prevPhone === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID
    else process.env.WHATSAPP_PHONE_NUMBER_ID = prevPhone
    if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID
    else process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID = prevPublic
  })

  it('rejects demo placeholders', () => {
    expect(isMetaPhoneNumberId('wa_phone_il_demo')).toBe(false)
    expect(isMetaPhoneNumberId('demo-123')).toBe(false)
    expect(isMetaPhoneNumberId(null)).toBe(false)
  })

  it('accepts Meta numeric phone number ids', () => {
    expect(isMetaPhoneNumberId('1262299850304510')).toBe(true)
  })

  it('falls back from demo country id to env', () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1262299850304510'
    expect(resolveWhatsAppPhoneNumberId('wa_phone_il_demo')).toBe(
      '1262299850304510',
    )
  })

  it('prefers valid country id over env', () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '999999999999999'
    expect(resolveWhatsAppPhoneNumberId('1262299850304510')).toBe(
      '1262299850304510',
    )
  })

  it('normalizes Israeli wa recipients to digits', () => {
    expect(normalizeWhatsAppRecipient('+972 55-281-9086')).toBe('972552819086')
    expect(normalizeWhatsAppRecipient('972501112233')).toBe('972501112233')
  })
})

describe('sendWhatsAppText ops_reply', () => {
  const prevToken = process.env.WHATSAPP_ACCESS_TOKEN
  const prevPhone = process.env.WHATSAPP_PHONE_NUMBER_ID

  afterEach(() => {
    vi.unstubAllGlobals()
    if (prevToken === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN
    else process.env.WHATSAPP_ACCESS_TOKEN = prevToken
    if (prevPhone === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID
    else process.env.WHATSAPP_PHONE_NUMBER_ID = prevPhone
  })

  it('fails clearly when token missing for ops_reply (no silent dry-run)', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1262299850304510'
    const result = await sendWhatsAppText({
      toWaId: '972501112233',
      text: 'בדיקה מהמערכת',
      purpose: 'ops_reply',
    })
    expect(result.ok).toBe(false)
    expect(result.dryRun).toBe(false)
    expect(result.error).toMatch(/WHATSAPP_ACCESS_TOKEN/)
  })

  it('fails when only demo phone number id is available', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID
    const result = await sendWhatsAppText({
      toWaId: '972501112233',
      text: 'בדיקה',
      phoneNumberId: 'wa_phone_il_demo',
      purpose: 'ops_reply',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Phone Number ID/)
  })

  it('sends free-form text on Graph success', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1262299850304510'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: 'wamid.TEST123' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendWhatsAppText({
      toWaId: '972501112233',
      text: 'בדיקה מהמערכת',
      purpose: 'ops_reply',
    })

    expect(result.ok).toBe(true)
    expect(result.dryRun).toBe(false)
    expect(result.waMessageId).toBe('wamid.TEST123')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      'https://graph.facebook.com/v21.0/1262299850304510/messages',
    )
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '972501112233',
      type: 'text',
      text: { body: 'בדיקה מהמערכת' },
    })
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toMatch(/^Bearer /)
  })

  it('surfaces Meta 400 errors with code details', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1262299850304510'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: '(#131047) Re-engagement message',
            type: 'OAuthException',
            code: 131047,
            error_subcode: 2018034,
            fbtrace_id: 'TRACE123',
          },
        }),
      }),
    )

    const result = await sendWhatsAppText({
      toWaId: '972501112233',
      text: 'בדיקה',
      purpose: 'ops_reply',
    })
    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe(131047)
    expect(result.fbtraceId).toBe('TRACE123')
    expect(result.error).toMatch(/24/)
  })

  it('still allows dry-run when forced', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN
    const result = await sendWhatsAppText({
      toWaId: '972501112233',
      text: 'דמו',
      purpose: 'ops_reply',
      forceDryRun: true,
    })
    expect(result.ok).toBe(true)
    expect(result.dryRun).toBe(true)
  })
})
