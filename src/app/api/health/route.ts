import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'maintainos',
    locale: 'he',
    pilot: 'IL',
    storeIdentity: ['qr', 'nfc', 'store_code'],
  })
}
