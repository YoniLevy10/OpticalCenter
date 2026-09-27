/**
 * iPhone-viewport smoke + timings for MaintainOS field flows (memory backend).
 * Usage: MAINTAINOS_FORCE_MEMORY=1 MAINTAINOS_ALLOW_TEST_AUTH=1 node scripts/perf-mobile-smoke.mjs
 */
import { chromium, devices } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const outDir = resolve('docs/qa')
mkdirSync(outDir, { recursive: true })
const shotDir = resolve('/opt/cursor/artifacts/screenshots')
mkdirSync(shotDir, { recursive: true })

async function timed(page, name, fn) {
  const t0 = performance.now()
  const result = await fn()
  const ms = +(performance.now() - t0).toFixed(1)
  return { name, ms, result }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'he-IL',
  })
  const page = await context.newPage()
  const metrics = []
  const network = []

  page.on('response', (res) => {
    const url = res.url()
    if (!url.includes('localhost:3000')) return
    network.push({
      url: url.replace(BASE, ''),
      status: res.status(),
      timing: res.request().timing?.() ?? null,
    })
  })

  metrics.push(
    await timed(page, 'login_first', async () => {
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
      await page.screenshot({
        path: resolve(shotDir, 'iphone-login.png'),
        fullPage: false,
      })
      return page.url()
    }),
  )

  metrics.push(
    await timed(page, 'demo_session', async () => {
      const res = await page.request.post(`${BASE}/api/auth/demo-session`, {
        data: { role: 'hq' },
      })
      return res.status()
    }),
  )

  metrics.push(
    await timed(page, 'dashboard', async () => {
      await page.goto(`${BASE}/ops/dashboard`, { waitUntil: 'networkidle' })
      await page.screenshot({
        path: resolve(shotDir, 'iphone-dashboard.png'),
        fullPage: false,
      })
      return page.locator('text=מה קורה עכשיו').count()
    }),
  )

  // Ensure at least one open non-demo ticket
  const create = await page.request.post(`${BASE}/api/tickets`, {
    data: {
      storeCode: '172',
      description: 'בדיקת מובייל — דלת הזזה תקועה',
      category: 'other',
      source: 'web_fallback',
    },
  })
  const created = await create.json()
  const ticketId = created.ticket?.id

  metrics.push(
    await timed(page, 'tickets_list', async () => {
      await page.goto(`${BASE}/ops/tickets?view=open`, {
        waitUntil: 'networkidle',
      })
      await page.screenshot({
        path: resolve(shotDir, 'iphone-tickets-list.png'),
        fullPage: false,
      })
      const hasSearch = await page
        .getByPlaceholder('חיפוש מספר, חנות או תיאור…')
        .count()
      const rows = await page.locator('a[href^="/ops/tickets/"]').count()
      return { hasSearch, rows }
    }),
  )

  metrics.push(
    await timed(page, 'tickets_search', async () => {
      await page.goto(
        `${BASE}/ops/tickets?view=open&q=${encodeURIComponent('דלת')}`,
        { waitUntil: 'networkidle' },
      )
      await page.screenshot({
        path: resolve(shotDir, 'iphone-tickets-search.png'),
        fullPage: false,
      })
      const text = await page.locator('body').innerText()
      return {
        hasDoor: text.includes('דלת'),
        hasLighting: text.includes('תאורה מהבהבת'),
      }
    }),
  )

  metrics.push(
    await timed(page, 'ticket_detail', async () => {
      await page.goto(`${BASE}/ops/tickets/${ticketId}`, {
        waitUntil: 'networkidle',
      })
      await page.screenshot({
        path: resolve(shotDir, 'iphone-ticket-detail-dock.png'),
        fullPage: false,
      })
      const assignBtn = page.getByRole('button', { name: /שייך טכנאי|החלף טכנאי/ })
      const closeBtn = page.getByRole('button', { name: 'סגור תקלה' })
      const assignCount = await assignBtn.count()
      const closeCount = await closeBtn.count()
      // Single mount: should be 1 of each (not 2 from dual trees)
      if (assignCount === 1) {
        await assignBtn.click()
        await page.waitForTimeout(300)
        await page.screenshot({
          path: resolve(shotDir, 'iphone-assign-sheet.png'),
          fullPage: false,
        })
        const sheetText = await page.locator('body').innerText()
        return {
          assignCount,
          closeCount,
          sheetOpenCounts: sheetText.includes('תקלות פתוחות'),
        }
      }
      return { assignCount, closeCount, sheetOpenCounts: false }
    }),
  )

  metrics.push(
    await timed(page, 'assign_write', async () => {
      const res = await page.request.patch(`${BASE}/api/tickets/${ticketId}`, {
        data: { assignedTo: '11111111-1111-4111-8111-111111111111' },
      })
      const json = await res.json()
      return { status: res.status(), ticketStatus: json.ticket?.status }
    }),
  )

  metrics.push(
    await timed(page, 'status_write', async () => {
      const res = await page.request.patch(`${BASE}/api/tickets/${ticketId}`, {
        data: { status: 'in_progress' },
      })
      const json = await res.json()
      return { status: res.status(), ticketStatus: json.ticket?.status }
    }),
  )

  await browser.close()

  const report = {
    generated_at: new Date().toISOString(),
    device: 'iPhone 13 (Playwright)',
    base: BASE,
    metrics,
    network_sample: network.slice(0, 40),
    notes: [
      'Demo tickets (source=demo) intentionally hidden from open queue.',
      'Double TicketActions mount removed — assignCount should be 1.',
      'Search uses URL debounce; server filters via listTickets q + applyQueue.',
    ],
  }
  writeFileSync(
    resolve(outDir, 'mobile-smoke-timings.json'),
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
