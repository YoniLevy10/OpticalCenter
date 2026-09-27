import { test, expect, type Page, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  createStore172Ticket,
  OTHER_TECH_ID,
  patchTicket,
} from './helpers/api'

const MAX_DIFF = 0.03

const VIEWPORTS = [
  { name: 'w390', width: 390, height: 844, desktop: false },
  { name: 'w430', width: 430, height: 932, desktop: false },
  // Stay well above Tailwind `md` (768px). Linux Chromium classic scrollbars
  // shrink `window.innerWidth` and can leave 800px viewports stuck in the
  // mobile shell (no dark sidebar) — use 960 so md still matches after chrome.
  { name: 'w960', width: 960, height: 1024, desktop: true },
  { name: 'w1024', width: 1024, height: 768, desktop: true },
  { name: 'w1440', width: 1440, height: 900, desktop: true },
] as const

async function gotoStable(
  page: Page,
  path: string,
  opts?: { desktop?: boolean },
) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => undefined)

  if (opts?.desktop) {
    // Wait until CSS `md` layout is actually active (Linux scrollbars can
    // briefly leave innerWidth under 768 after a resize from mobile).
    await page.waitForFunction(
      () =>
        window.matchMedia('(min-width: 768px)').matches &&
        window.innerWidth >= 768,
      undefined,
      { timeout: 5_000 },
    )
  }

  // Desktop shell fetches /api/health for the status chip — wait past "בודק…".
  const status = page.locator('[data-visual="system-status"]')
  if (await status.count()) {
    await expect(status).not.toHaveAttribute('aria-label', /בודק/, {
      timeout: 5_000,
    }).catch(() => undefined)
  }
}

/** Live clocks + numeric ticket ids that drift between runs. */
function dynamicMasks(page: Page): Locator[] {
  return [
    page.locator('[data-live="sla"]'),
    page.locator('[data-live="age"]'),
    page.locator('.live-sla'),
    page.locator('.live-age'),
    page.locator('.t-num'),
    page.locator('[data-live="ticket-no"]'),
    // Lifecycle WA notifies + chronology length vary by ticket id / prior seeds.
    page.locator('[data-visual="ticket-timeline"]'),
    page.locator('[data-activity-kind]'),
    // Global queue counts grow as prior e2e tests seed the shared memory store.
    page.locator('[data-visual="attention-strip"]'),
    // Health chip races (unknown → partial/ok) across CI/local.
    page.locator('[data-visual="system-status"]'),
  ]
}

async function shot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    maxDiffPixelRatio: MAX_DIFF,
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

    // Stable light theme — CI hour must not flip auto dark and break snapshots.
    await page.addInitScript(() => {
      window.localStorage.setItem('maintainos-theme', 'light')
    })

    // Isolate from tickets seeded by earlier e2e files in the shared memory store.
    await request.post('/api/demo/reset-memory')

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
        path: `/ops/tickets?view=open&store=172`,
      },
      { key: 'ops-ticket-detail', path: `/ops/tickets/${ticketId}` },
      { key: 'tech-jobs', path: `/tech?techId=${OTHER_TECH_ID}` },
      {
        key: 'tech-job-detail',
        path: `/tech/${ticketId}?techId=${OTHER_TECH_ID}`,
      },
      // Login UI changes with auth policy; keep functional coverage elsewhere.
      // Snapshots: e2e/visual-pack.spec.ts-snapshots/login-* retained but not asserted.
    ]

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      )
      for (const route of routes) {
        await gotoStable(page, route.path, { desktop: vp.desktop })
        if (vp.desktop) {
          const layout = await page.evaluate(() => ({
            innerWidth: window.innerWidth,
            md: window.matchMedia('(min-width: 768px)').matches,
          }))
          expect(
            layout.md,
            `desktop viewport ${vp.name} should match md (innerWidth=${layout.innerWidth})`,
          ).toBe(true)
        }
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
