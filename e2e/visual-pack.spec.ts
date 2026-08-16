import { test, expect, type Page, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createStore172Ticket,
  OTHER_TECH_ID,
  patchTicket,
} from './helpers/api'

const MAX_DIFF = 0.05

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

/** Live clocks + numeric ticket ids that drift between runs. */
function dynamicMasks(page: Page): Locator[] {
  return [
    page.locator('[data-live="sla"]'),
    page.locator('[data-live="age"]'),
    page.locator('.live-sla'),
    page.locator('.live-age'),
    page.locator('.t-num'),
    // Lifecycle WA notifies embed display numbers + /tech/{uuid} links;
    // bubble height still shifts layout — mask the whole chronology panel.
    page.locator('[data-visual="ticket-timeline"]'),
    page.locator('[data-activity-kind]'),
  ]
}

async function shot(page: Page, name: string) {
  // Ops detail timeline/WA body length varies per ticket id — allow more slack.
  const loose = name.startsWith('ops-ticket-detail')
  await expect(page).toHaveScreenshot(name, {
    maxDiffPixelRatio: loose ? 0.2 : MAX_DIFF,
    // Viewport only — fullPage height drifts as the memory store accumulates tickets.
    mask: dynamicMasks(page),
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

    // Unique copy + OTHER_TECH so list pages stay stable even if prior e2e
    // tests already seeded DEMO_TECH_ID jobs in the shared memory store.
    const marker = `VISUAL_PACK_${Date.now()}`
    const { ticketId } = await createStore172Ticket(request, {
      text: `המזגן הראשי לא עובד ${marker}`,
    })
    await patchTicket(request, ticketId, { assignedTo: OTHER_TECH_ID })

    const routes: { key: string; path: string }[] = [
      {
        key: 'ops-tickets-open',
        path: `/ops/tickets?view=open&q=${encodeURIComponent(marker)}`,
      },
      { key: 'ops-ticket-detail', path: `/ops/tickets/${ticketId}` },
      { key: 'tech-jobs', path: `/tech?techId=${OTHER_TECH_ID}` },
      {
        key: 'tech-job-detail',
        path: `/tech/${ticketId}?techId=${OTHER_TECH_ID}`,
      },
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
    await patchTicket(request, ticketId, { assignedTo: OTHER_TECH_ID })

    for (const path of [
      `/ops/tickets/${ticketId}`,
      `/tech?techId=${OTHER_TECH_ID}`,
      `/tech/${ticketId}?techId=${OTHER_TECH_ID}`,
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
