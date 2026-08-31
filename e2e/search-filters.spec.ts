import { test, expect } from '@playwright/test'
import { createStore172Ticket, demoWhatsApp, uniqueWaId } from './helpers/api'

test.describe('Search & filters', () => {
  test('open / resolved tabs via querystring', async ({ page, request }) => {
    await createStore172Ticket(request, {
      text: 'המזגן לא עובד בחנות בדיקה',
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/ops/tickets?view=open', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'תקלות' }).first()).toBeVisible()
    await expect(page.getByText(/מזגן|אבן גבירול|172/).first()).toBeVisible()

    await page.goto('/ops/tickets?view=resolved', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByRole('heading', { name: 'תקלות' }).first()).toBeVisible()
    await expect(page.getByRole('tab', { name: 'הסתיימו' })).toBeVisible()

    await page.goto('/ops/tickets?view=open&store=172', {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.getByText(/172|אבן גבירול|מזגן/).first()).toBeVisible()
  })

  test('seed ticket appears in open list', async ({ page, request }) => {
    const wa = uniqueWaId()
    await demoWhatsApp(request, {
      wa_id: wa,
      text: 'STORE_101',
      source: 'whatsapp',
    })
    const created = await demoWhatsApp(request, {
      wa_id: wa,
      text: 'QAUNIQUE_SEARCH_TOKEN_9911 נורה שרופה',
      source: 'whatsapp',
    })
    expect(created.ticket_id).toBeTruthy()

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/ops/tickets?view=open', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByText(/QAUNIQUE_SEARCH_TOKEN_9911|נורה שרופה/).first(),
    ).toBeVisible()
  })
})
