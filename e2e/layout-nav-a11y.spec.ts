import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createStore172Ticket, DEMO_TECH_ID, patchTicket } from './helpers/api'

const VIEWPORTS = [
  { name: 'iphoneSE', width: 375, height: 667 },
  { name: 'iphone12', width: 390, height: 844 },
  { name: 'iphone14proMax', width: 430, height: 932 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

async function gotoStable(page: import('@playwright/test').Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => undefined)
}

test.describe('Navigation & layout', () => {
  test('desktop sidebar routes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    // /ops redirects to dashboard
    await gotoStable(page, '/ops')
    await expect(page).toHaveURL(/\/ops\/dashboard/)
    await expect(page.getByRole('heading', { name: 'לוח בקרה' })).toBeVisible()
    await gotoStable(page, '/ops/tickets')
    await expect(page.getByRole('heading', { name: 'תקלות' })).toBeVisible()
    await gotoStable(page, '/ops/stores')
    await expect(page.getByRole('heading', { name: 'חנויות' })).toBeVisible()
    await gotoStable(page, '/ops/reports')
    await expect(page.getByRole('heading', { name: 'דוחות' })).toBeVisible()
    await gotoStable(page, '/ops/settings')
    await expect(page.getByRole('heading', { name: 'הגדרות' })).toBeVisible()
  })

  test('mobile bottom nav + More', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoStable(page, '/ops/dashboard')
    const bottomNav = page.locator('nav.fixed')
    await expect(bottomNav.getByText('לוח בקרה')).toBeVisible()
    await expect(bottomNav.getByText('תקלות')).toBeVisible()
    await expect(bottomNav.getByText('חנויות')).toBeVisible()
    await bottomNav.getByRole('button', { name: 'עוד' }).click()
    await expect(page.getByRole('dialog').getByRole('link', { name: 'הגדרות' })).toBeVisible()
  })

  test('deep link ticket + refresh', async ({ page, request }) => {
    const { ticketId } = await createStore172Ticket(request)
    await gotoStable(page, `/ops/tickets/${ticketId}`)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/מזגן|תקלה|OC-/).first()).toBeVisible()
  })

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      for (const path of ['/ops', '/ops/dashboard', '/ops/tickets', '/ops/stores', '/tech']) {
        await gotoStable(page, path)
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement
          return doc.scrollWidth > doc.clientWidth + 2
        })
        expect(overflow, `${path} overflows at ${vp.name}`).toBe(false)
      }
    })
  }
})

test.describe('A11y smoke', () => {
  test('ops tickets has no critical axe violations', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'chromium',
      'axe smoke on chromium only',
    )
    await gotoStable(page, '/ops/tickets')
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()
    const critical = results.violations.filter((v) => v.impact === 'critical')
    expect(critical).toEqual([])
  })
})

// Visual regression: e2e/visual-pack.spec.ts

test.describe('PWA manifests', () => {
  test('HQ and tech manifests + icons', async ({ request }) => {
    const hq = await request.get('/manifest.webmanifest')
    expect(hq.ok()).toBeTruthy()
    const hqJson = await hq.json()
    expect(hqJson.name).toMatch(/MaintainOS/)
    expect(hqJson.start_url).toBe('/ops/tickets')

    const tech = await request.get('/manifest-tech.webmanifest')
    expect(tech.ok()).toBeTruthy()
    const techJson = await tech.json()
    expect(techJson.start_url).toBe('/tech')

    const icon = await request.get('/icons/icon-192.png')
    expect(icon.ok()).toBeTruthy()
    const apple = await request.get('/icons/apple-touch-icon.png')
    expect(apple.ok()).toBeTruthy()
  })
})

test.describe('Offline honesty', () => {
  test('tech update shows failure when API aborted', async ({
    page,
    request,
    context,
  }) => {
    test.skip(
      test.info().project.name !== 'chromium',
      'route abort flaky on webkit in CI',
    )
    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID })
    await gotoStable(page, `/tech/${ticketId}?techId=${DEMO_TECH_ID}`)

    await context.route('**/api/tech/tickets/**', (route) => route.abort())
    const resolveBtn = page.getByRole('button', { name: /סיום|resolved|נפתר/i })
    if ((await resolveBtn.count()) > 0) {
      await resolveBtn.first().click()
      await expect(page.getByText(/שגיאה|נכשל|רשת/i).first()).toBeVisible({
        timeout: 10_000,
      })
    }
  })
})
