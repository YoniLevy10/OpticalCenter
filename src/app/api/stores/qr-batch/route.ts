import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { fetchStores } from '@/modules/stores/data'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const format = url.searchParams.get('format') ?? 'html'

  const { stores } = await fetchStores()
  const active = stores.filter((s) => s.is_active !== false)

  const cards = await Promise.all(
    active.map(async (s) => {
      const waLink = storeWhatsAppDeepLink(s.code)
      const qrDataUrl = await QRCode.toDataURL(waLink, {
        margin: 1,
        width: 200,
      })
      return { store: s, qrDataUrl, waLink }
    }),
  )

  if (format === 'json') {
    return NextResponse.json({
      count: cards.length,
      stores: cards.map((c) => ({
        code: c.store.code,
        name: c.store.name,
        waLink: c.waLink,
      })),
    })
  }

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>MaintainOS — QR Batch</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; }
    h1 { font-size: 18px; margin: 0 0 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .card { break-inside: avoid; border: 1px solid #e8e8e4; border-radius: 8px; padding: 12px; text-align: center; }
    .card img { width: 160px; height: 160px; }
    .name { font-weight: 600; margin-top: 8px; }
    .code { color: #6b6b66; font-size: 12px; }
    .prefill { direction: ltr; font-size: 11px; color: #9a9a94; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Optical Center — QR לכל החנויות (${cards.length})</h1>
  <div class="grid">
    ${cards
      .map(
        (c) => `
    <div class="card">
      <img src="${c.qrDataUrl}" alt="QR ${c.store.code}" />
      <div class="name">${c.store.name}</div>
      <div class="code">#${c.store.code}</div>
      <div class="prefill">STORE_${c.store.code}</div>
    </div>`,
      )
      .join('')}
  </div>
  <script>window.onload = () => { /* optional auto-print */ };</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline; filename="maintainos-qr-batch.html"',
    },
  })
}
