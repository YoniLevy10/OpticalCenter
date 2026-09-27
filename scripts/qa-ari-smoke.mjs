/**
 * Smoke: tasks add + users edit modal + stores QR accordion.
 * Run: MAINTAINOS_FORCE_MEMORY=1 node scripts/qa-ari-smoke.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const fails = []

try {
  // Demo session
  await page.goto(`${BASE}/login`)
  const demoBtn = page.getByRole('button', { name: /כניסה כדמו/ })
  if (await demoBtn.count()) {
    await demoBtn.click()
    await page.waitForURL(/\/ops\//, { timeout: 15000 }).catch(() => {})
  } else {
    await page.goto(`${BASE}/ops/dashboard`)
  }

  // --- Tasks ---
  await page.goto(`${BASE}/ops/tasks`)
  await page.getByLabel('כותרת משימה').fill('בדיקת ארי')
  await page.getByRole('button', { name: 'הוספה' }).click()
  const taskRow = page.getByText('בדיקת ארי')
  await taskRow.waitFor({ timeout: 5000 })
  console.log('PASS tasks: add')

  await page.getByRole('button', { name: 'סמן כבוצע' }).first().click()
  await page.getByRole('button', { name: 'סמן כלא בוצע' }).first().waitFor({
    timeout: 3000,
  })
  console.log('PASS tasks: toggle done')

  // --- Users edit ---
  await page.goto(`${BASE}/ops/users`)
  await page.locator('table tbody tr').first().waitFor({ timeout: 15000 })
  await page
    .getByRole('button', { name: /עריכת / })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ timeout: 5000 })
  const phoneField = dialog.getByLabel(/טלפון/)
  await phoneField.waitFor({ timeout: 3000 })
  console.log('PASS users: edit card opens')
  await page.keyboard.press('Escape')

  // --- Stores QR accordion ---
  await page.goto(`${BASE}/ops/stores`)
  await page.getByText('QR לפי סניף').waitFor({ timeout: 10000 })
  await page.locator('[aria-label="QR לפי סניף"] button').first().click()
  await page.locator('[aria-label="QR לפי סניף"] img').first().waitFor({
    timeout: 5000,
  })
  console.log('PASS stores: QR accordion')

  // --- Nav: tasks primary, no status ---
  await page.goto(`${BASE}/ops/dashboard`)
  const tasksNav = page.locator('aside a[href="/ops/tasks"]')
  if ((await tasksNav.count()) === 0) fails.push('nav missing /ops/tasks')
  else console.log('PASS nav: tasks link')
  const statusNav = page.locator('a[href="/ops/status"]')
  if ((await statusNav.count()) > 0) fails.push('status link still in nav')
  else console.log('PASS nav: no status link')
} catch (err) {
  fails.push(err instanceof Error ? err.message : String(err))
  await page.screenshot({ path: '/tmp/qa-ari-fail.png', fullPage: true })
  console.error('screenshot /tmp/qa-ari-fail.png')
} finally {
  await browser.close()
}

if (fails.length) {
  console.error('FAILS:', fails)
  process.exit(1)
}
console.log('ALL SMOKE CHECKS PASSED')
