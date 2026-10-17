/**
 * Targeted re-capture: visit with HVAC vendor + tech completion sheet.
 */
import { chromium } from 'playwright'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'http://localhost:3000'
const OUT =
  '/cursor/stores/bc-01a13b11-ee9b-76dc-bcf6-db48ce863532/media'
const ARTIFACTS = '/opt/cursor/artifacts/screenshots'
mkdirSync(OUT, { recursive: true })
mkdirSync(ARTIFACTS, { recursive: true })

async function shot(page, name, { fullPage = false } = {}) {
  const file = `c09-${name}.png`
  const dest = join(OUT, file)
  await page.screenshot({ path: dest, fullPage })
  copyFileSync(dest, join(ARTIFACTS, file))
  console.log('SHOT', file)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'he-IL',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /כניסה כדמו/ }).click()
  await page.waitForURL(/\/ops\//, { timeout: 20000 })

  // --- Visit: store 6006, pick HVAC vendor ---
  await page.goto(`${BASE}/ops/tickets?store=6006`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const boxes = page.locator('input[type="checkbox"][aria-label*="בחירה"]')
  const n = await boxes.count()
  console.log('checkboxes', n)
  for (let i = 0; i < Math.min(n, 2); i++) {
    await boxes.nth(i).check({ force: true })
  }
  await page.getByRole('button', { name: /שיגור ביקור/ }).click()
  await page.waitForTimeout(600)

  // Select HVAC vendor in sheet
  const vendorSelect = page.locator('select').first()
  if ((await vendorSelect.count()) > 0) {
    const options = await vendorSelect.locator('option').allTextContents()
    console.log('vendors', options)
    const hvacOpt = options.findIndex((t) =>
      /CoolAir|מיזוג|hvac|HVAC|קירור/i.test(t),
    )
    if (hvacOpt >= 0) {
      await vendorSelect.selectOption({ index: hvacOpt })
    } else {
      // try by value containing hvac
      const vals = await vendorSelect.locator('option').evaluateAll((opts) =>
        opts.map((o) => ({ v: o.value, t: o.textContent })),
      )
      console.log('vendor vals', vals)
      const hit = vals.find((o) => /hvac|coolair/i.test(o.v + o.t))
      if (hit) await vendorSelect.selectOption(hit.v)
    }
  }
  await shot(page, 'a04-visit-dispatch-sheet-hvac')

  await page.getByRole('button', { name: /אישור שיגור/ }).click()
  await page.waitForTimeout(1500)
  await shot(page, 'a04-visit-dispatch-result')

  // Also try API-level for clean success path (document env)
  const apiRes = await page.evaluate(async () => {
    const key = `c09-${Date.now()}`
    const res = await fetch('/api/ops/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        storeId: 'il-store-172',
        ticketIds: ['trial-6006-hvac'],
        vendorId: 'vendor-pref-hvac-center',
        notes: 'C09 evidence',
        idempotencyKey: key,
      }),
    })
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data }
  })
  console.log('API visit', JSON.stringify(apiRes, null, 2))

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'a04-visit-after-refresh')

  // Store page visit panel
  await page.goto(`${BASE}/ops/stores/6006`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'a04-store-visit-panel', { fullPage: true })

  // --- Tech: find tech id from ops users or ticket ---
  // Trial HVAC may be assigned — open /tech with techId from ticket
  const ticket = await page.evaluate(async () => {
    const res = await fetch('/api/ops/tickets/trial-6006-hvac', {
      credentials: 'same-origin',
    }).catch(() => null)
    if (!res || !res.ok) return null
    return res.json()
  })
  console.log('ticket fetch', ticket?.assigned_to || ticket?.id || 'none')

  // List technicians via page scrape from assign UI if needed
  await page.goto(`${BASE}/ops/tickets/trial-6006-hvac`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(500)

  // Prefer internal tech list from memory — try common demo tech query
  let techId = null
  const techLinks = page.locator('a[href*="techId="]')
  if ((await techLinks.count()) > 0) {
    const href = await techLinks.first().getAttribute('href')
    techId = href?.match(/techId=([^&]+)/)?.[1] ?? null
  }

  // Fallback: hit users/technicians API-ish by evaluating service through assign dropdown
  if (!techId) {
    // From ticket trial panel assign options
    const opts = page.locator('select option')
    const texts = await opts.evaluateAll((els) =>
      els.map((e) => ({ v: e.value, t: e.textContent?.trim() })),
    )
    console.log(
      'select options sample',
      texts.filter((t) => t.v).slice(0, 20),
    )
    const techOpt = texts.find(
      (t) => t.v && t.v.length > 10 && /טכנ|tech|דני|רוןי/i.test(t.t || ''),
    )
    if (techOpt) techId = techOpt.v
  }

  // Last resort: seed known from listInternalTechnicians via work-actions not available —
  // scrape /ops/users if exists
  if (!techId) {
    await page.goto(`${BASE}/ops/users`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(400)
    const body = await page.locator('body').innerText()
    console.log('users page snippet', body.slice(0, 400))
  }

  console.log('techId', techId)

  if (techId) {
    await page.goto(`${BASE}/tech?techId=${techId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await shot(page, 'a05-tech-portal')

    // Open first job
    const job = page.locator('a[href*="/tech/"]').first()
    if ((await job.count()) > 0) {
      await job.click()
      await page.waitForTimeout(800)
      await shot(page, 'a05-tech-job-detail')
      const start = page.getByRole('button', { name: /התחל טיפול/ })
      if ((await start.count()) > 0) {
        await start.click()
        await page.waitForTimeout(800)
      }
      const done = page.getByRole('button', { name: /סיימתי/ })
      if ((await done.count()) > 0) {
        await done.click()
        await page.waitForTimeout(700)
        await shot(page, 'a05-tech-completion-sheet')
      } else {
        await shot(page, 'a05-tech-completion-sheet')
      }
    }
  } else {
    // Still open /tech and capture empty/assigned state honestly
    await page.goto(`${BASE}/tech`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await shot(page, 'a05-tech-portal')
    const job = page.locator('a[href*="/tech/"]').first()
    if ((await job.count()) > 0) {
      await job.click()
      await page.waitForTimeout(800)
      await shot(page, 'a05-tech-job-detail')
      await page.getByRole('button', { name: /התחל טיפול/ }).click().catch(() => {})
      await page.waitForTimeout(600)
      await page.getByRole('button', { name: /סיימתי/ }).click().catch(() => {})
      await page.waitForTimeout(600)
      await shot(page, 'a05-tech-completion-sheet')
    }
  }

  // RFQ: open ticket, scroll to draft, save
  await page.goto(`${BASE}/ops/tickets/trial-6001-electrical`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(600)
  const rfqHeading = page.getByText(/טיוטת הצעת מחיר|הצעת מחיר|RFQ/)
  if ((await rfqHeading.count()) > 0) {
    await rfqHeading.first().scrollIntoViewIfNeeded()
  }
  await shot(page, 'a11-rfq-draft', { fullPage: true })
  const saveDraft = page.getByRole('button', { name: /שמור טיוטה|שמירה|העתק/ })
  if ((await saveDraft.count()) > 0) {
    await saveDraft.first().click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, 'a11-rfq-draft-saved')
  }

  // Preferred vendors badges
  const badge = page.locator('[data-channel]')
  console.log('channel badges', await badge.count())
  if ((await badge.count()) > 0) {
    await badge.first().scrollIntoViewIfNeeded()
    await shot(page, 'a11-dispatchable-vs-dial')
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
