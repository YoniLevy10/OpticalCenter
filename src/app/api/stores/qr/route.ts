import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import {
  storeWhatsAppDeepLink,
  whatsAppShareUrl,
} from '@/modules/stores/whatsapp-link'
import { assetWhatsAppPrefill } from '@/modules/assets/service'
import { captureError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Lightweight QR for store / asset WhatsApp deep links.
 * GET /api/stores/qr?code=172&format=svg|png
 * GET /api/stores/qr?code=172&asset=AC-04&format=svg|png
 */
export async function GET(request: NextRequest) {
  try {
    const code = (request.nextUrl.searchParams.get('code') ?? '').trim()
    const asset = (request.nextUrl.searchParams.get('asset') ?? '').trim()
    const format = (request.nextUrl.searchParams.get('format') ?? 'svg').toLowerCase()
    if (!/^\d{1,6}$/.test(code)) {
      return NextResponse.json({ error: 'קוד חנות לא תקין' }, { status: 400 })
    }

    const url = asset
      ? whatsAppShareUrl(assetWhatsAppPrefill(code, asset))
      : storeWhatsAppDeepLink(code)

    const fileBase = asset
      ? `asset-${code}-${asset.replace(/[^a-zA-Z0-9_-]/g, '')}-qr`
      : `store-${code}-qr`

    if (format === 'png') {
      const buf = await QRCode.toBuffer(url, {
        type: 'png',
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'Content-Disposition': `inline; filename="${fileBase}.png"`,
        },
      })
    }

    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'M',
      width: 512,
    })
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${fileBase}.svg"`,
      },
    })
  } catch (err) {
    captureError(err, { route: 'GET /api/stores/qr' })
    return NextResponse.json({ error: 'יצירת QR נכשלה' }, { status: 500 })
  }
}
