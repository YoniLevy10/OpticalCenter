/**
 * C09 full-cycle evidence capture — demo memory env only.
 * Run with: MAINTAINOS_FORCE_MEMORY=1 node scripts/c09-evidence.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.C09_BASE_URL || 'http://localhost:3000'
const OUT =
  process.env.C09_MEDIA_DIR ||
  '/cursor/stores/bc-01a13b11-ee9b-76dc-bcf6-db48ce863532/media'
const ARTIFACTS = '/opt/cursor/artifacts/screenshots'

mkdirSync(OUT, { recursive: true })
mkdirSync(ARTIFACTS, { recursive: true })

const results = []

async function shot(page, name, { fullPage = false } = {}) {
  const file = `c09-${name}.png`
  const dest = join(OUT, file)
  const art = join(ARTIFACTS, file)
  await page.screenshot({ path: dest, fullPage })
  copyFileSync(dest, art)
  results.push({ name, file: dest, ok: true })
  console.log('SHOT', file)
  return dest
}

async function softClick(page, selector, timeout = 4000) {
  const loc = page.locator(selector).first()
  if ((await loc.count()) === 0) return false
  try {
    await loc.click({ timeout })
    return true
  } catch {
    return false
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'he-IL',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  // --- Login demo ---
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await softClick(page, 'button:has-text("כניסה כדמו")')
  await page.waitForURL(/\/ops\//, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(800)

  // A06 / dashboard
  await page.goto(`${BASE}/ops/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'a06-dashboard')

  // A01 tickets queue + stuck + detail + timeline
  await page.goto(`${BASE}/ops/tickets`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, 'a01-tickets-queue')

  await softClick(page, 'a:has-text("תקועות")')
  await softClick(page, 'button:has-text("תקועות")')
  await page.waitForTimeout(500)
  await shot(page, 'a01-tickets-stuck')

  await page.goto(`${BASE}/ops/tickets/trial-6001-electrical`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(700)
  await shot(page, 'a01-ticket-timeline', { fullPage: true })

  // A08 classification explain + correct (C06)
  const classPanel = page.locator('text=הסבר סיווג').first()
  if ((await classPanel.count()) > 0) {
    await classPanel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await shot(page, 'a08-classification-explain')
  } else {
    results.push({
      name: 'a08-classification-explain',
      ok: false,
      reason: 'missing הסבר סיווג',
    })
    console.log('MISS a08 classification panel')
  }

  // Try correction UI if present
  const correctBtn = page
    .locator('button:has-text("תיקון"), button:has-text("שנה סיווג")')
    .first()
  if ((await correctBtn.count()) > 0) {
    await correctBtn.click().catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, 'a08-classification-correct')
  }

  // A11 / C07 vendors + RFQ
  const pref = page.locator('text=מועדפים').first()
  if ((await pref.count()) > 0) {
    await pref.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
  }
  await shot(page, 'a11-preferred-vendors', { fullPage: true })

  const rfq = page
    .getByText(/טיוטת הצעה|הצעת מחיר|טיוטה/)
    .first()
  if ((await rfq.count()) > 0) {
    await rfq.scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(200)
    await softClick(page, 'button:has-text("טיוטה")')
    await softClick(page, 'button:has-text("צור טיוטה")')
    await page.waitForTimeout(500)
  }
  await shot(page, 'a11-rfq-draft', { fullPage: true })

  // Midrag deep-link presence
  const midrag = page.locator('a[href*="midrag"]').or(page.getByText('מידרג')).first()
  if ((await midrag.count()) > 0) {
    await midrag.scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, 'a11-midrag-deeplink')
  }

  // A02 store
  await page.goto(`${BASE}/ops/stores`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  if (!(await softClick(page, 'a[href*="/ops/stores/6001"]'))) {
    await softClick(page, 'a:has-text("6001")')
  }
  await page.waitForTimeout(800)
  if (!page.url().includes('/ops/stores/')) {
    await page.goto(`${BASE}/ops/stores/6001`, { waitUntil: 'networkidle' })
  }
  await page.waitForTimeout(500)
  await shot(page, 'a02-store-detail', { fullPage: true })

  // A03/A04 visit multi-select + dispatch
  await page.goto(`${BASE}/ops/tickets?store=6006`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  // Fallback if query param different
  if ((await page.locator('input[type="checkbox"][aria-label*="בחירה"]').count()) < 1) {
    await page.goto(`${BASE}/ops/tickets`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    // try store filter select
    const storeSelect = page.locator('select, [role="combobox"]').filter({
      hasText: /חנות|כל החנויות/,
    })
    if ((await storeSelect.count()) > 0) {
      await storeSelect.first().selectOption({ label: /6006/ }).catch(async () => {
        await softClick(page, 'button:has-text("חנות"), [aria-label*="חנות"]')
        await softClick(page, 'text=6006')
      })
      await page.waitForTimeout(600)
    }
  }

  const boxes = page.locator('input[type="checkbox"][aria-label*="בחירה"]')
  const boxCount = await boxes.count()
  console.log('visit checkboxes', boxCount)
  for (let i = 0; i < Math.min(boxCount, 2); i++) {
    await boxes.nth(i).check({ force: true }).catch(() => {})
  }
  await page.waitForTimeout(400)
  await shot(page, 'a03-visit-multiselect')

  let openDispatch = await softClick(page, 'button:has-text("שיגור ביקור")')
  if (!openDispatch) openDispatch = await softClick(page, 'button:has-text("אישור שיגור")')
  if (openDispatch) {
    await page.waitForTimeout(500)
    await shot(page, 'a04-visit-dispatch-sheet')
    let confirm = await softClick(page, 'button:has-text("אישור שיגור")')
    if (!confirm) confirm = await softClick(page, 'button:has-text("שלח ביקור")')
    if (!confirm) confirm = await softClick(page, 'button:has-text("שיגור")')
    if (confirm) {
      await page.waitForTimeout(1200)
      await shot(page, 'a04-visit-dispatch-result')
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      await shot(page, 'a04-visit-after-refresh')
    }
  } else {
    // store page dispatch path
    await page.goto(`${BASE}/ops/stores/6006`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const storeBoxes = page.locator('input[type="checkbox"]')
    const sc = await storeBoxes.count()
    for (let i = 0; i < Math.min(sc, 2); i++) {
      await storeBoxes.nth(i).check({ force: true }).catch(() => {})
    }
    await softClick(page, 'button:has-text("שיגור")')
    await page.waitForTimeout(600)
    await shot(page, 'a04-visit-dispatch-sheet')
    await softClick(page, 'button:has-text("אישור שיגור")')
    await softClick(page, 'button:has-text("שלח")')
    await page.waitForTimeout(1200)
    await shot(page, 'a04-visit-dispatch-result')
  }

  // A05 / C04 tech proof
  await page.goto(`${BASE}/tech`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await shot(page, 'a05-tech-portal')

  // Try start + finish
  let start = await softClick(page, 'button:has-text("התחל טיפול")')
  if (!start) start = await softClick(page, 'a:has-text("התחל")')
  if (start) await page.waitForTimeout(800)
  await softClick(page, 'button:has-text("סיימתי")')
  await softClick(page, 'button:has-text("סיום")')
  await page.waitForTimeout(600)
  await shot(page, 'a05-tech-completion-sheet')

  // A07 store WA
  await page.goto(`${BASE}/store`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, 'a07-store-wa-primary')

  // A09 documents hearing (expect blocked / annual only)
  await page.goto(`${BASE}/ops/documents`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'a09-documents-hearing')

  // A10 alerts (C05)
  await page.goto(`${BASE}/ops/alerts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const alertsOk = !page.url().includes('/login')
  await shot(page, 'a10-alerts-center')
  results.push({ name: 'a10-nav-reachable', ok: alertsOk })

  // Nav presence for alerts
  await page.goto(`${BASE}/ops/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const navAlert = page.locator('a[href="/ops/alerts"], a:has-text("התראות")')
  const navOk = (await navAlert.count()) > 0
  if (navOk) {
    await navAlert.first().scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, 'a10-alerts-nav')
  }
  results.push({ name: 'a10-nav-link', ok: navOk })

  // Professionals book
  await page.goto(`${BASE}/ops/professionals`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'a11-professionals')

  await browser.close()

  const summaryPath = join(OUT, '..', 'internal', 'c09-evidence-run.json')
  mkdirSync(join(OUT, '..', 'internal'), { recursive: true })
  const { writeFileSync } = await import('node:fs')
  writeFileSync(summaryPath, JSON.stringify({ base: BASE, results }, null, 2))
  console.log('DONE', summaryPath)
  console.log(JSON.stringify(results, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
