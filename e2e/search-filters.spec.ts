import { test, expect } from '@playwright/test'
import { createStore172Ticket, demoWhatsApp, uniqueWaId } from './helpers/api'

test.describe('Search & filters', () => {
  test('filter open / critical / resolved via querystring', async ({
    page,
    request,
  }) => {
    const { step2 } = await createStore172Ticket(request, {
      text: 'המזגן לא עובד בחנות בדיקה',
    })
    const display = String(step2.display_number || step2.ticket?.display_number || '')

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/ops/tickets?status=open', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'תקלות' })).toBeVisible()
    if (display) {
      await expect(page.locator('table').getByText(display).first()).toBeVisible()
    } else {
      await expect(page.locator('table').getByText(/מזגן|אבן גבירול/).first()).toBeVisible()
    }

    await page.goto('/ops/tickets?status=critical', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'תקלות' })).toBeVisible()

    await page.goto('/ops/tickets?q=172', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('table').getByText(/172|אבן גבירול/).first()).toBeVisible()

    await page.goto('/ops/tickets?q=' + encodeURIComponent('מזגן'), {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('table').getByText(/מזגן/).first()).toBeVisible()
  })

  test('seed ticket then search by description', async ({ page, request }) => {
    const wa = uniqueWaId()
    await demoWhatsApp(request, { wa_id: wa, text: 'STORE_101', source: 'demo' })
    const created = await demoWhatsApp(request, {
      wa_id: wa,
      text: 'QAUNIQUE_SEARCH_TOKEN_9911 נורה שרופה',
      source: 'demo',
    })
    expect(created.ticket_id).toBeTruthy()

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(
      '/ops/tickets?q=' + encodeURIComponent('QAUNIQUE_SEARCH_TOKEN_9911'),
      { waitUntil: 'domcontentloaded' },
    )
    await expect(
      page.locator('table').getByText(/QAUNIQUE_SEARCH_TOKEN_9911/).first(),
    ).toBeVisible()
  })
})
