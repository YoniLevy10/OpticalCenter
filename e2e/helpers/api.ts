import { APIRequestContext, expect } from '@playwright/test'

export const DEMO_TECH_ID = '11111111-1111-4111-8111-111111111111'
export const OTHER_TECH_ID = '22222222-2222-4222-8222-222222222222'

export function uniqueWaId(prefix = '97250') {
  const n = Math.floor(Math.random() * 1_000_0000)
    .toString()
    .padStart(7, '0')
  return `${prefix}${n}`
}

export type DemoWaResult = {
  ok: boolean
  reply: string | null
  ticket: {
    id: string
    display_number?: string | null
    status?: string
    priority?: string
    store_code?: string | null
    description?: string
  } | null
  duplicate?: boolean
  ticket_id?: string | null
  display_number?: string | null
  state?: string | null
  error?: string | null
}

export async function demoWhatsApp(
  request: APIRequestContext,
  body: {
    wa_id: string
    text?: string | null
    store_code?: string | null
    media_url?: string | null
    source?: string | null
  },
): Promise<DemoWaResult> {
  const res = await request.post('/api/demo/whatsapp', { data: body })
  const json = (await res.json()) as DemoWaResult
  return json
}

export async function patchTicket(
  request: APIRequestContext,
  id: string,
  body: { status?: string; assignedTo?: string },
) {
  const res = await request.patch(`/api/tickets/${id}`, { data: body })
  const json = await res.json()
  return { status: res.status(), json }
}

export async function patchTechTicket(
  request: APIRequestContext,
  id: string,
  body: Record<string, unknown>,
) {
  const res = await request.patch(`/api/tech/tickets/${id}`, { data: body })
  const json = await res.json()
  return { status: res.status(), json }
}

export async function getTechTicket(request: APIRequestContext, id: string) {
  const res = await request.get(`/api/tech/tickets/${id}`)
  const json = await res.json()
  return { status: res.status(), json }
}

export async function createStore172Ticket(
  request: APIRequestContext,
  opts?: { wa_id?: string; text?: string },
) {
  const wa_id = opts?.wa_id ?? uniqueWaId()
  const text = opts?.text ?? 'המזגן הראשי לא עובד'
  const step1 = await demoWhatsApp(request, {
    wa_id,
    text: 'STORE_172',
    source: 'demo',
  })
  expect(step1.ok).toBeTruthy()
  expect(step1.ticket_id).toBeFalsy()
  const step2 = await demoWhatsApp(request, { wa_id, text, source: 'demo' })
  expect(step2.ok).toBeTruthy()
  expect(step2.ticket_id).toBeTruthy()
  return { wa_id, step1, step2, ticketId: step2.ticket_id as string }
}
