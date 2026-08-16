import { test, expect, type Page, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createStore172Ticket, DEMO_TECH_ID, patchTicket } from './helpers/api'

const MAX_DIFF = 0.03

const VIEWPORTS = [
  { name: 'w390', width: 390, height: 844 },
  { name: 'w430', width: 430, height: 932 },
  { name: 'w768', width: 768, height: 1024 },
  { name: 'w1024', width: 1024, height: 768 },
  { name: 'w1440', width: 1440, height: 900 },
] as const

async function gotoStable(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => undefined)
}

function liveMasks(page: Page): Locator[] {
  return [
    page.locator('[data-live="sla"]'),
    page.locator('[data-live="age"]'),
    page.locator('.live-sla'),
    page.locator('.live-age'),
  ]
}

async function shot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    maxDiffPixelRatio: MAX_DIFF,
    fullPage: true,
    mask: liveMasks(page),
  })
}

test.describe('Visual regression pack', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'visual pack on chromium only',
    )
  })

  test('critical routes across viewports', async ({ page, request }) => {
    test.setTimeout(180_000)

    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID })

    const routes: { key: string; path: string }[] = [
      { key: 'ops-tickets-open', path: '/ops/tickets?view=open' },
      { key: 'ops-ticket-detail', path: `/ops/tickets/${ticketId}` },
      { key: 'tech-jobs', path: `/tech?techId=${DEMO_TECH_ID}` },
      { key: 'tech-job-detail', path: `/tech/${ticketId}?techId=${DEMO_TECH_ID}` },
      { key: 'login', path: '/login' },
    ]

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      for (const route of routes) {
        await gotoStable(page, route.path)
        await shot(page, `${route.key}-${vp.name}.png`)
      }
    }
  })
})

test.describe('A11y critical routes', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'axe smoke on chromium only',
    )
  })

  test('ticket detail + tech pages have no critical axe violations', async ({
    page,
    request,
  }) => {
    const { ticketId } = await createStore172Ticket(request)
    await patchTicket(request, ticketId, { assignedTo: DEMO_TECH_ID })

    for (const path of [
      `/ops/tickets/${ticketId}`,
      `/tech?techId=${DEMO_TECH_ID}`,
      `/tech/${ticketId}?techId=${DEMO_TECH_ID}`,
    ]) {
      await gotoStable(page, path)
      const results = await new AxeBuilder({ page })
        .disableRules(['color-contrast'])
        .analyze()
      const critical = results.violations.filter((v) => v.impact === 'critical')
      expect(critical, `critical axe on ${path}`).toEqual([])
    }
  })
})
