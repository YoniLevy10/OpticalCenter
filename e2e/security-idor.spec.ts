import { test, expect } from '@playwright/test'
import {
  DEMO_TECH_ID,
  OTHER_TECH_ID,
  createStore172Ticket,
  getTechTicket,
  patchTechTicket,
  patchTicket,
} from './helpers/api'

test.describe('Security / IDOR — desired deny (known P0 gaps)', () => {
  test('tech GET detail must require auth scope', async ({ request }) => {
    // Desired: 401/403. Currently 200 — expected fail until auth is fixed.
    test.fail()
    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID })
    const res = await getTechTicket(request, ticketId)
    expect([401, 403]).toContain(res.status)
  })
})

test.describe('Security / IDOR — current surface documentation', () => {
  test('documents that tech GET currently returns 200 for any id', async ({
    request,
  }) => {
    const { ticketId } = await createStore172Ticket(request)
    const res = await getTechTicket(request, ticketId)
    expect(res.status).toBe(200)
    expect(res.json.ticket.id).toBe(ticketId)
  })

  test('tech PATCH with other techId cannot steal assigned ticket', async ({
    request,
  }) => {
    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID })
    const steal = await patchTechTicket(request, ticketId, {
      techId: OTHER_TECH_ID,
      status: 'in_progress',
    })
    expect([403, 409, 400]).toContain(steal.status)
  })

  test('HQ ticket PATCH has no auth gate today (documents gap)', async ({
    request,
  }) => {
    const { ticketId } = await createStore172Ticket(request)
    const res = await patchTicket(request, ticketId, {
      assignedTo: DEMO_TECH_ID,
    })
    expect(res.status).toBe(200)
  })
})
