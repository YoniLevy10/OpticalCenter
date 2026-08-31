import { test, expect } from '@playwright/test'
import {
  DEMO_TECH_ID,
  createStore172Ticket,
  demoWhatsApp,
  getTechTicket,
  patchTechTicket,
  patchTicket,
  uniqueWaId,
} from './helpers/api'

test.describe('Golden Path — WhatsApp → HQ → Tech → Resolve', () => {
  test('full pilot flow (memory)', async ({ page, request }) => {
    const wa_id = uniqueWaId()

    const s1 = await demoWhatsApp(request, {
      wa_id,
      text: 'STORE_172',
      source: 'whatsapp',
    })
    expect(s1.ok).toBe(true)
    expect(s1.state).toBe('awaiting_description')
    expect(s1.ticket_id).toBeFalsy()
    expect(s1.reply || '').toMatch(/172|אבן גבירול|תארו|תקלה/)

    const s2 = await demoWhatsApp(request, {
      wa_id,
      text: 'המזגן הראשי לא עובד',
      source: 'whatsapp',
    })
    expect(s2.ok).toBe(true)
    expect(s2.ticket_id).toBeTruthy()
    expect(s2.display_number || s2.reply || '').toMatch(/OC-|הדיווח/)
    expect(s2.ticket?.store_code).toBe('172')
    expect(s2.ticket?.priority).toBe('high')
    expect(s2.ticket?.description || '').toMatch(/מזגן/)
    const ticketId = s2.ticket_id as string
    const display = String(s2.display_number || s2.ticket?.display_number || '')

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/ops/tickets?view=open', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'תקלות' })).toBeVisible()
    if (display) {
      await expect(page.locator('table').getByText(display).first()).toBeVisible()
    }
    await expect(page.locator('table').getByText(/אבן גבירול|172/).first()).toBeVisible()

    await page.goto(`/ops/tickets/${ticketId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/מזגן הראשי/).first()).toBeVisible()
    await expect(page.getByText(/כרונולוגיה|פעילות/).first()).toBeVisible()

    const assign = await patchTicket(request, ticketId, {
      assignedTo: DEMO_TECH_ID,
    })
    expect(assign.status).toBe(200)
    expect(assign.json.ticket.status).toBe('assigned')
    expect(assign.json.ticket.assigned_to).toBe(DEMO_TECH_ID)

    await page.goto(`/tech?techId=${DEMO_TECH_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/העבודות/).first()).toBeVisible()
    // Prefer clicking the job card (avoids soft-nav abort on rapid goto)
    const jobLink = page.locator(`a[href*="/tech/${ticketId}"]`).first()
    if (await jobLink.count()) {
      await jobLink.click()
      await page.waitForURL(new RegExp(`/tech/${ticketId}`))
    } else {
      await page.goto(`/tech/${ticketId}?techId=${DEMO_TECH_ID}`, {
        waitUntil: 'load',
      })
    }
    await expect(page.getByText(/מזגן|אבן גבירול/).first()).toBeVisible()

    const start = await patchTechTicket(request, ticketId, {
      status: 'in_progress',
    })
    expect(start.status).toBe(200)

    const mid = await getTechTicket(request, ticketId, DEMO_TECH_ID)
    expect(mid.json.ticket.status).toBe('in_progress')

    const resolve = await patchTechTicket(request, ticketId, {
      status: 'resolved',
      note: 'הוחלף מדחס / נבדק בשטח',
      photoUrl: 'https://example.com/qa-photo.jpg',
    })
    expect(resolve.status).toBe(200)

    const done = await getTechTicket(request, ticketId, DEMO_TECH_ID)
    expect(done.json.ticket.status).toBe('resolved')
    expect(done.json.ticket.resolved_at || done.json.ticket.events).toBeTruthy()

    await page.goto(`/ops/tickets/${ticketId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/resolved|הסתיים|הושלם|נפתר/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test('one-shot STORE + issue creates single ticket', async ({ request }) => {
    const wa_id = uniqueWaId()
    const res = await demoWhatsApp(request, {
      wa_id,
      text: 'STORE_172 המזגן לא עובד',
      source: 'whatsapp',
    })
    expect(res.ok).toBe(true)
    expect(res.ticket_id).toBeTruthy()
  })
})

test.describe('Golden Path helpers', () => {
  test('createStore172Ticket helper', async ({ request }) => {
    const created = await createStore172Ticket(request)
    expect(created.ticketId).toBeTruthy()
  })
})
