import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import {
  storeWhatsAppDeepLink,
  whatsAppShareUrl,
} from '@/modules/stores/whatsapp-link'
import { assetWhatsAppPrefill } from '@/modules/assets/service'
import { getSettings } from '@/modules/settings/service'
import { captureError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function resolveBusinessPhone(): Promise<string | null> {
  try {
    const { settings } = await getSettings()
    const fromSettings = (settings.wa_business_phone || '').replace(/\D/g, '')
    if (fromSettings) return fromSettings
  } catch {
    /* fall through */
  }
  const fromEnv = (process.env.NEXT_PUBLIC_WA_BUSINESS_PHONE || '').replace(
    /\D/g,
    '',
  )
  return fromEnv || null
}

/**
 * Lightweight QR for store / asset WhatsApp deep links.
 * Prefers Ops settings wa_business_phone, then NEXT_PUBLIC_WA_BUSINESS_PHONE.
 * GET /api/stores/qr?code=172&format=svg|png
 */
export async function GET(request: NextRequest) {
  try {
    const code = (request.nextUrl.searchParams.get('code') ?? '').trim()
    const asset = (request.nextUrl.searchParams.get('asset') ?? '').trim()
    const format = (request.nextUrl.searchParams.get('format') ?? 'svg').toLowerCase()
    if (!/^\d{1,6}$/.test(code)) {
      return NextResponse.json({ error: 'קוד חנות לא תקין' }, { status: 400 })
    }

    const businessPhone = await resolveBusinessPhone()
    if (!businessPhone) {
      return NextResponse.json(
        {
          error:
            'חסר מספר WhatsApp עסקי. הגדירו ב־Ops → הגדרות → WhatsApp או NEXT_PUBLIC_WA_BUSINESS_PHONE.',
          code: 'wa_business_phone_missing',
        },
        { status: 503 },
      )
    }

    const url = asset
      ? whatsAppShareUrl(assetWhatsAppPrefill(code, asset), businessPhone)
      : storeWhatsAppDeepLink(code, businessPhone)

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
          'Cache-Control': 'public, max-age=300',
          'Content-Disposition': `inline; filename="${fileBase}.png"`,
          'X-WhatsApp-Deep-Link': url,
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
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': `inline; filename="${fileBase}.svg"`,
        'X-WhatsApp-Deep-Link': url,
      },
    })
  } catch (err) {
    captureError(err, { route: 'GET /api/stores/qr' })
    return NextResponse.json({ error: 'יצירת QR נכשלה' }, { status: 500 })
  }
}
