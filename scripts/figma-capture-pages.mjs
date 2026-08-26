import { chromium } from '@playwright/test'

const captures = [
  {
    path: '/ops/dashboard',
    captureId: '9d01c360-fa10-41cb-92b2-4b79cbb098d5',
  },
  {
    path: '/ops/tickets?view=open',
    captureId: '57a4ef38-648a-4b9b-b1fa-80b1435241f6',
  },
]

function captureHash(captureId) {
  const endpoint = encodeURIComponent(
    `https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`,
  )
  return `#figmacapture=${captureId}&figmaendpoint=${endpoint}&figmadelay=3000`
}

const browser = await chromium.launch()

for (const item of captures) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const url = `http://localhost:3000${item.path}${captureHash(item.captureId)}`
  console.log(`Capturing ${item.path} ...`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(10000)
  console.log(`Done ${item.path}`)
  await page.close()
}

await browser.close()
console.log('Captures submitted')
