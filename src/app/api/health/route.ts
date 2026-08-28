import { NextResponse } from 'next/server'

export async function GET() {
  const { supabaseReady } = await import('@/lib/data/memory-store')
  const ready = await supabaseReady()
  return NextResponse.json({
    ok: true,
    service: 'maintainos',
    locale: 'he',
    pilot: 'IL',
    storeIdentity: ['qr', 'nfc', 'store_code'],
    backend: ready ? 'supabase' : 'memory',
    pilotReadiness: '/api/health/pilot',
  })
}
