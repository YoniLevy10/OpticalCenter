import { test, expect } from '@playwright/test'
import {
  DEMO_TECH_ID,
  OTHER_TECH_ID,
  HQ_ADMIN_ID,
  createStore172Ticket,
  getTechTicket,
  patchTechTicket,
  patchTicket,
  authHeaders,
} from './helpers/api'

test.describe('Security / IDOR — deny posture (P0)', () => {
  test('unauthenticated tech GET → 401', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    const res = await getTechTicket(request, ticketId, null)
    expect(res.status).toBe(401)
  })

  test('unauthenticated tech PATCH → 401', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    const res = await request.patch(`/api/tech/tickets/${ticketId}`, {
      data: { status: 'in_progress' },
    })
    expect(res.status()).toBe(401)
  })

  test('unauthenticated HQ PATCH → 401', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    const res = await request.patch(`/api/tickets/${ticketId}`, {
      data: { assignedTo: DEMO_TECH_ID },
    })
    expect(res.status()).toBe(401)
  })

  test('Tech B cannot read Tech A assigned ticket', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID }, HQ_ADMIN_ID)
    const res = await getTechTicket(request, ticketId, OTHER_TECH_ID)
    expect([403, 404]).toContain(res.status)
  })

  test('Tech B cannot PATCH Tech A ticket', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID }, HQ_ADMIN_ID)
    const steal = await patchTechTicket(
      request,
      ticketId,
      { status: 'in_progress' },
      OTHER_TECH_ID,
    )
    expect([403, 404]).toContain(steal.status)
  })

  test('HQ admin can assign', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    const res = await patchTicket(request, ticketId, {
      assignedTo: DEMO_TECH_ID,
    })
    expect(res.status).toBe(200)
    expect(res.json.ticket.assigned_to).toBe(DEMO_TECH_ID)
  })

  test('authenticated tech can read own assigned ticket', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID })
    const res = await getTechTicket(request, ticketId, DEMO_TECH_ID)
    expect(res.status).toBe(200)
    expect(res.json.ticket.id).toBe(ticketId)
  })
})

test.describe('Auth header presence', () => {
  test('test bearer for admin is accepted on HQ patch', async ({ request }) => {
    const { ticketId } = await createStore172Ticket(request)
    const res = await request.patch(`/api/tickets/${ticketId}`, {
      data: { status: 'triaged' },
      headers: authHeaders(HQ_ADMIN_ID),
    })
    expect(res.status()).toBe(200)
  })
})
