import { NextResponse } from 'next/server'
import { listAssets } from '@/modules/assets/service'
import { fetchStores } from '@/modules/stores/data'
import { checkRateLimit } from '@/lib/rate-limit'
import { captureError } from '@/lib/monitoring'

/** Public read-only assets for a store (report form asset picker). */
export async function GET(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
    const limited = checkRateLimit(`report-assets:${ip}`, 60, 60_000)
    if (!limited.allowed) {
      return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 })
    }

    const url = new URL(request.url)
    const storeCode = (url.searchParams.get('storeCode') ?? '').trim()
    if (!storeCode) {
      return NextResponse.json({ error: 'חסר קוד חנות' }, { status: 400 })
    }

    const { stores } = await fetchStores()
    const store = stores.find((s) => s.code === storeCode)
    if (!store) {
      return NextResponse.json({ assets: [] })
    }

    const { assets } = await listAssets({ storeId: store.id })
    return NextResponse.json({
      assets: assets.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        asset_type: a.asset_type,
      })),
    })
  } catch (err) {
    captureError(err, { route: 'GET /api/report/assets' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
