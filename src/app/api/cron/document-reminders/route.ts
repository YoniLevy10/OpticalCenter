import { NextResponse } from 'next/server'
import { listDocuments } from '@/lib/data/ops-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { notifyAri } from '@/modules/notify/ari'
import { isDocumentOverdue } from '@/modules/documents/rules'
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
  const due = listDocuments().filter((doc) => isDocumentOverdue(doc))
  if (due.length) {
    const lines = due
      .slice(0, 8)
      .map((doc) => `${doc.storeCode || '—'} ${doc.docType}`)
      .join(', ')
    await notifyAri(`מסמכים באיחור (${due.length}): ${lines}`)
  }
  logEvent('cron:documents', 'info', 'reminders', { count: due.length })
  return NextResponse.json({
    ok: true,
    overdue: due.map((doc) => ({
      id: doc.id,
      storeCode: doc.storeCode,
      docType: doc.docType,
      owner: doc.owner,
    })),
  })
}
