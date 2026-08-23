import { chromium } from '@playwright/test'

const captures = [
  {
    url: 'http://localhost:3000/ops/dashboard',
    captureId: '9d01c360-fa10-41cb-92b2-4b79cbb098d5',
  },
  {
    url: 'http://localhost:3000/ops/tickets?view=open',
    captureId: '57a4ef38-648a-4b9b-b1fa-80b1435241f6',
  },
]

async function capturePage(page, { url, captureId }) {
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`
  await page.route('**/*', async (route) => {
    const response = await route.fetch()
    const headers = { ...response.headers() }
    delete headers['content-security-policy']
    delete headers['content-security-policy-report-only']
    await route.fulfill({ response, headers })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const r = await page.context().request.get(
    'https://mcp.figma.com/mcp/html-to-design/capture.js',
  )
  await page.evaluate((s) => {
    const el = document.createElement('script')
    el.textContent = s
    document.head.appendChild(el)
  }, await r.text())
  await page.waitForFunction(() => typeof window.figma?.captureForDesign === 'function', {
    timeout: 15000,
  })
  await page.waitForTimeout(2000)
  return await page.evaluate(
    ({ captureId, endpoint }) =>
      window.figma.captureForDesign({
        captureId,
        endpoint,
        selector: 'body',
      }),
    { captureId, endpoint },
  )
}

const browser = await chromium.launch()

for (const item of captures) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  console.log(`Inject capture ${item.url}`)
  const result = await capturePage(page, item)
  console.log(JSON.stringify(result))
  await page.close()
}

await browser.close()
