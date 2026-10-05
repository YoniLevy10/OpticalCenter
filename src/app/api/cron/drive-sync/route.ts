import { NextResponse } from 'next/server'
import { hydrateOpsLedger, persistOpsLedger } from '@/lib/data/ops-db'
import { getDriveSync } from '@/lib/data/ops-ledger'
import { syncDriveFolder } from '@/modules/drive/sync'
import { notifyAri } from '@/modules/notify/ari'
import { logEvent } from '@/lib/logging'

export const runtime = 'nodejs'

function cronAuthorized(request: Request): boolean {
  if (process.env.MAINTAINOS_FORCE_MEMORY === '1') return true
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return (
    auth === `Bearer ${secret}` ||
    request.headers.get('x-cron-secret') === secret ||
    request.headers.get('cron-secret') === secret
  )
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  await hydrateOpsLedger()
  const folder = getDriveSync().rootFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
  if (!folder) {
    return NextResponse.json({ ok: true, skipped: true })
  }
  try {
    const result = await syncDriveFolder(folder)
    if (result.pulled > 0 && result.review > 0) {
      await notifyAri(
        `סנכרון דרייב: ${result.pulled} קבצים עודכנו, ${result.review} דורשים בדיקה.`,
      )
    }
    await persistOpsLedger()
    logEvent('cron:drive-sync', 'info', 'synced', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sync failed'
    logEvent('cron:drive-sync', 'error', message, {})
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
