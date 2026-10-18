/**
 * C08 hearing calibrations evidence — memory demo only.
 * Prefers an already-running next on C08_BASE_URL.
 */
import { chromium } from 'playwright'
import { mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.C08_BASE_URL || 'http://127.0.0.1:3000'
const OUT =
  process.env.C08_MEDIA_DIR ||
  '/cursor/stores/bc-01a13b11-ee9b-76dc-bcf6-db48ce863532/media'
const ARTIFACTS = '/opt/cursor/artifacts/screenshots'

mkdirSync(OUT, { recursive: true })
mkdirSync(ARTIFACTS, { recursive: true })

async function shot(page, name, { fullPage = false } = {}) {
  const file = `c08-${name}.png`
  const dest = join(OUT, file)
  const art = join(ARTIFACTS, file)
  await page.screenshot({ path: dest, fullPage })
  copyFileSync(dest, art)
  console.log('SHOT', file)
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

async function addCalibration(page, { storeCode, storeName, docType, expiry }) {
  await page.locator('#doc-store').fill(storeCode)
  await page.locator('#doc-store-name').fill(storeName)
  await page.locator('#doc-owner').fill('ארי')
  await page.locator('#doc-expiry').fill(expiry)
  await page.locator('#doc-type').selectOption(docType)
  await page.getByRole('button', { name: 'שמירת מסמך' }).click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'he-IL',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await softClick(page, 'button:has-text("כניסה כדמו")')
  await page.waitForURL(/\/ops\//, { timeout: 20000 }).catch(() => {})

  await page.goto(`${BASE}/ops/documents`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, 'documents-types', { fullPage: true })

  // Open type select for close-up of כיול א/ב/ג
  await page.locator('#doc-type').focus()
  await page.locator('#doc-type').click()
  await page.waitForTimeout(200)
  await shot(page, 'type-select')

  const soon = new Date()
  soon.setDate(soon.getDate() + 20)
  const soonIso = soon.toISOString().slice(0, 10)
  const far = new Date()
  far.setMonth(far.getMonth() + 8)
  const farIso = far.toISOString().slice(0, 10)

  await addCalibration(page, {
    storeCode: '6018',
    storeName: 'כרמיאל',
    docType: 'hearing_a',
    expiry: soonIso,
  })
  await addCalibration(page, {
    storeCode: '6009',
    storeName: 'נהריה',
    docType: 'hearing_b',
    expiry: soonIso,
  })
  await addCalibration(page, {
    storeCode: '6001',
    storeName: 'אשדוד',
    docType: 'hearing_c',
    expiry: farIso,
  })

  await page.goto(`${BASE}/ops/documents`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await shot(page, 'calibrations-list', { fullPage: true })

  // Highlight due-soon badge
  const soonBadge = page.getByText('תזכורת חודש מראש').first()
  if ((await soonBadge.count()) > 0) {
    await soonBadge.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, 'month-ahead-reminder')
  } else {
    console.log('MISS month-ahead badge')
  }

  // Cron smoke (memory allows without secret)
  const cron = await page.request.get(`${BASE}/api/cron/document-reminders`)
  const body = await cron.json()
  console.log('CRON', cron.status(), JSON.stringify(body))

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
