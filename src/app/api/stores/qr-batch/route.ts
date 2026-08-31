import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { fetchStores } from '@/modules/stores/data'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { buildStoresQrPdf } from '@/modules/stores/qr-pdf'
import { captureError } from '@/lib/monitoring'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const format = url.searchParams.get('format') ?? 'html'

  const businessPhone = await resolveWhatsAppBusinessPhone()

  if (!businessPhone) {
    return NextResponse.json(
      {
        error:
          'חסר מספר WhatsApp עסקי. הגדירו ב־Ops → הגדרות → WhatsApp לפני הדפסת QR.',
        code: 'wa_business_phone_missing',
      },
      { status: 503 },
    )
  }

  const { stores } = await fetchStores()
  const active = stores.filter((s) => s.is_active !== false)

  if (format === 'pdf') {
    try {
      const pdf = await buildStoresQrPdf(
        active.map((s) => ({ code: s.code, name: s.name })),
        businessPhone,
      )
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition':
            'attachment; filename="maintainos-qr-batch.pdf"',
          'Cache-Control': 'no-store',
        },
      })
    } catch (err) {
      captureError(err, { route: 'GET /api/stores/qr-batch?format=pdf' })
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'יצירת PDF נכשלה' },
        { status: 500 },
      )
    }
  }

  const cards = await Promise.all(
    active.map(async (s) => {
      const waLink = storeWhatsAppDeepLink(s.code, businessPhone)
      const qrDataUrl = await QRCode.toDataURL(waLink, {
        margin: 1,
        width: 280,
        errorCorrectionLevel: 'M',
      })
      return { store: s, qrDataUrl, waLink }
    }),
  )

  if (format === 'json') {
    return NextResponse.json({
      count: cards.length,
      businessPhone,
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
    .prefill { direction: ltr; font-size: 11px; color: #9a9a94; margin-top: 4px; word-break: break-all; }
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
      <div class="code">חנות ${c.store.code}</div>
      <div class="prefill">${c.waLink}</div>
    </div>`,
      )
      .join('')}
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
