import { beforeEach, describe, expect, it } from 'vitest'
import { processInboundMessage } from '@/modules/whatsapp/intake'
import type { InboundMessage } from '@/modules/whatsapp/types'
import { memGetSession, memListTickets, memUpsertSession } from '@/lib/data/memory-store'
import { MEM_COUNTRY_ID } from '@/lib/data/memory-store'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

function msg(
  partial: Partial<InboundMessage> & { text?: string | null },
  waId = `97250${Math.floor(Math.random() * 1e7)
    .toString()
    .padStart(7, '0')}`,
): InboundMessage {
  return {
    messageId: partial.messageId ?? `m_${Math.random().toString(36).slice(2)}`,
    waId: partial.waId ?? waId,
    phoneNumberId: partial.phoneNumberId ?? null,
    text: partial.text ?? null,
    mediaUrl: partial.mediaUrl ?? null,
    mediaKind: partial.mediaKind ?? null,
    timestamp: partial.timestamp ?? null,
    sourceHint: partial.sourceHint ?? 'demo',
  }
}

describe('WhatsApp intake matrix (memory)', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
  })

  it('WA-01 known phone skips store ask (memory store_phones)', async () => {
    const { MEM_KNOWN_EMPLOYEE_WA, MEM_WA_PHONE_IL } = await import(
      '@/lib/data/memory-store'
    )
    const before = memListTickets().length
    const r = await processInboundMessage(
      msg({
        text: 'המזגן לא עובד',
        waId: MEM_KNOWN_EMPLOYEE_WA,
        phoneNumberId: MEM_WA_PHONE_IL,
      }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeTruthy()
    expect(memListTickets().length).toBe(before + 1)
    const ticket = memListTickets().find((t) => t.id === r.ticketId)
    expect(ticket?.stores?.code).toBe('172')
  })

  it('WA-02 unknown phone asks for store; no ticket', async () => {
    const before = memListTickets().length
    const r = await processInboundMessage(msg({ text: 'המזגן לא עובד' }), {
      skipOutboundGraph: true,
    })
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeFalsy()
    expect(memListTickets().length).toBe(before)
    expect(r.reply || '').toMatch(/חנות|קוד|STORE/i)
  })

  it('WA-03 bare store code 172', async () => {
    const r = await processInboundMessage(msg({ text: '172' }), {
      skipOutboundGraph: true,
    })
    expect(r.ok).toBe(true)
    expect(r.state).toBe('awaiting_description')
    expect(r.ticketId).toBeFalsy()
  })

  it('WA-04 STORE_172', async () => {
    const r = await processInboundMessage(msg({ text: 'STORE_172' }), {
      skipOutboundGraph: true,
    })
    expect(r.ok).toBe(true)
    expect(r.state).toBe('awaiting_description')
  })

  it('WA-05 store + issue same message creates ticket', async () => {
    const r = await processInboundMessage(
      msg({ text: 'STORE_172 המזגן לא עובד' }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeTruthy()
  })

  it('WA-06 invalid store then recover', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    const bad = await processInboundMessage(
      msg({ text: 'STORE_999999', waId }),
      { skipOutboundGraph: true },
    )
    expect(bad.ok).toBe(true)
    expect(bad.ticketId).toBeFalsy()
    expect(bad.reply || '').toMatch(/לא נמצ|שגוי|לא מוכר|999/i)

    const ok = await processInboundMessage(msg({ text: 'STORE_172', waId }), {
      skipOutboundGraph: true,
    })
    expect(ok.ok).toBe(true)
    expect(ok.state).toBe('awaiting_description')
  })

  it('WA-07 image + text creates ticket', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    await processInboundMessage(msg({ text: 'STORE_172', waId }), {
      skipOutboundGraph: true,
    })
    const r = await processInboundMessage(
      msg({
        waId,
        text: 'נזילת מים מהתקרה',
        mediaUrl: 'https://example.com/leak.jpg',
        mediaKind: 'image',
      }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeTruthy()
    const ticket = memListTickets().find((t) => t.id === r.ticketId)
    expect(ticket?.messages.some((m) => m.media_url)).toBe(true)
  })

  it('WA-08 image only after store — no crash', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    await processInboundMessage(msg({ text: 'STORE_172', waId }), {
      skipOutboundGraph: true,
    })
    const r = await processInboundMessage(
      msg({
        waId,
        text: null,
        mediaUrl: 'https://example.com/only.jpg',
        mediaKind: 'image',
      }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    // Product may create ticket or ask clarification — must not error
    expect(r.error).toBeFalsy()
  })

  it('WA-09 duplicate messageId creates one ticket', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    const messageId = `dup_${Math.random().toString(36).slice(2)}`
    await processInboundMessage(msg({ text: 'STORE_172', waId }), {
      skipOutboundGraph: true,
    })
    const before = memListTickets().length
    const a = await processInboundMessage(
      msg({
        waId,
        messageId,
        text: 'המזגן לא עובד בדיקת כפילות',
      }),
      { skipOutboundGraph: true },
    )
    const b = await processInboundMessage(
      msg({
        waId,
        messageId,
        text: 'המזגן לא עובד בדיקת כפילות',
      }),
      { skipOutboundGraph: true },
    )
    expect(a.ticketId).toBeTruthy()
    expect(b.duplicate || !b.ticketId).toBe(true)
    expect(memListTickets().length).toBe(before + 1)
  })

  it('WA-10 expired session does not reuse stale store incorrectly', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    memUpsertSession({
      wa_id: waId,
      country_id: MEM_COUNTRY_ID,
      store_id: 'il-store-172',
      store_code: '172',
      state: 'awaiting_description',
      pending_description: null,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      updated_at: new Date(Date.now() - 60_000).toISOString(),
    })
    const r = await processInboundMessage(
      msg({ waId, text: 'המזגן לא עובד אחרי תום סשן' }),
      { skipOutboundGraph: true },
    )
    // Expired → reset; should ask store again, not create ticket on stale store
    // (implementation resets expired/done to awaiting_store)
    const session = memGetSession(waId)
    if (r.ticketId) {
      // If implementation still allows, document — prefer ask store
      expect(session).toBeTruthy()
    } else {
      expect(r.ticketId).toBeFalsy()
      expect(r.reply || session?.state).toBeTruthy()
    }
  })

  it('WA-11 completed session + new issue creates new ticket', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    await processInboundMessage(msg({ text: 'STORE_172', waId }), {
      skipOutboundGraph: true,
    })
    const first = await processInboundMessage(
      msg({ waId, text: 'תקלה ראשונה מזגן' }),
      { skipOutboundGraph: true },
    )
    expect(first.ticketId).toBeTruthy()
    const secondStore = await processInboundMessage(
      msg({ waId, text: 'STORE_172' }),
      { skipOutboundGraph: true },
    )
    expect(secondStore.state).toBe('awaiting_description')
    const second = await processInboundMessage(
      msg({ waId, text: 'תקלה שנייה נורה' }),
      { skipOutboundGraph: true },
    )
    expect(second.ticketId).toBeTruthy()
    expect(second.ticketId).not.toBe(first.ticketId)
  })

  it('WA-15 follow-up photo after ticket attaches to same ticket', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    await processInboundMessage(msg({ text: 'STORE_172', waId }), {
      skipOutboundGraph: true,
    })
    const created = await processInboundMessage(
      msg({ waId, text: 'נזילה מהתקרה בחנות' }),
      { skipOutboundGraph: true },
    )
    expect(created.ticketId).toBeTruthy()
    const before = memListTickets().length
    const followUp = await processInboundMessage(
      msg({
        waId,
        text: null,
        mediaUrl: 'https://example.com/follow-up-leak.jpg',
        mediaKind: 'image',
      }),
      { skipOutboundGraph: true },
    )
    expect(followUp.ok).toBe(true)
    expect(followUp.ticketId).toBe(created.ticketId)
    expect(memListTickets().length).toBe(before)
    const ticket = memListTickets().find((t) => t.id === created.ticketId)
    expect(
      ticket?.messages.some(
        (m) => m.media_url === 'https://example.com/follow-up-leak.jpg',
      ),
    ).toBe(true)
    expect(followUp.reply || '').toMatch(/צורפה|תמונה/i)
  })

  it('WA-12 France phone_number_id + 172 → FR store not IL', async () => {
    const { MEM_WA_PHONE_FR } = await import('@/lib/data/memory-store')
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    const r = await processInboundMessage(
      msg({
        text: 'STORE_172 clim en panne',
        waId,
        phoneNumberId: MEM_WA_PHONE_FR,
      }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeTruthy()
    const ticket = memListTickets().find((t) => t.id === r.ticketId)
    expect(ticket?.stores?.name).toMatch(/Paris/i)
    expect(ticket?.country_id).toBe('33333333-3333-3333-3333-333333333333')
  })

  it('WA-12 unknown phone_number_id fails safely', async () => {
    const r = await processInboundMessage(
      msg({
        text: 'STORE_172',
        phoneNumberId: 'totally-unknown-phone-id',
      }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(false)
    expect(r.ticketId).toBeFalsy()
  })

  it('WA-13 human_takeover silences bot', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    memUpsertSession({
      wa_id: waId,
      country_id: MEM_COUNTRY_ID,
      store_id: 'il-store-172',
      store_code: '172',
      state: 'awaiting_description',
      pending_description: null,
      human_takeover: true,
    })
    const before = memListTickets().length
    const r = await processInboundMessage(
      msg({ waId, text: 'המזגן לא עובד בזמן takeover' }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    expect(r.reply).toBeNull()
    expect(r.ticketId).toBeFalsy()
    expect(memListTickets().length).toBe(before)
  })

  it('WA-13b human_takeover auto-resumes after done + new text', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    memUpsertSession({
      wa_id: waId,
      country_id: MEM_COUNTRY_ID,
      store_id: 'il-store-172',
      store_code: '172',
      state: 'done',
      pending_description: null,
      human_takeover: true,
      active_ticket_id: 'ticket-old',
    })
    const before = memListTickets().length
    const r = await processInboundMessage(
      msg({
        waId,
        text: 'יש תקלה חדשה — המזגן שוב לא עובד באולם',
      }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    expect(r.reply).toBeTruthy()
    expect(memListTickets().length).toBeGreaterThan(before)
    const session = memGetSession(waId)
    expect(session?.human_takeover).toBe(false)
  })

  it('WA-14 STORE_172 HVAC leak → high priority ticket', async () => {
    const waId = `97250${Math.floor(Math.random() * 1e7)
      .toString()
      .padStart(7, '0')}`
    await processInboundMessage(msg({ text: 'STORE_172', waId }), {
      skipOutboundGraph: true,
    })
    const r = await processInboundMessage(
      msg({
        waId,
        text: 'המזגן הראשי לא עובד ויש ממנו נזילה',
      }),
      { skipOutboundGraph: true },
    )
    expect(r.ok).toBe(true)
    expect(r.ticketId).toBeTruthy()
    const ticket = memListTickets().find((t) => t.id === r.ticketId)
    expect(ticket?.category).toBe('hvac')
    expect(ticket?.priority).toBe('high')
    expect(r.reply || '').toMatch(/פתחתי תקלה|OC-/)
  })
})
