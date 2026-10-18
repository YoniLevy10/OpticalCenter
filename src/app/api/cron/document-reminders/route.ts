import { NextResponse } from 'next/server'
import { listDocuments } from '@/lib/data/ops-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { notifyAri } from '@/modules/notify/ari'
import {
  documentTypeLabel,
  isDocumentDueSoon,
  isDocumentOverdue,
} from '@/modules/documents/rules'
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
  const docs = listDocuments()
  const overdue = docs.filter((doc) => isDocumentOverdue(doc))
  const dueSoon = docs.filter((doc) => isDocumentDueSoon(doc))
  if (overdue.length || dueSoon.length) {
    const overdueLines = overdue
      .slice(0, 6)
      .map((doc) => `${doc.storeCode || '—'} ${documentTypeLabel(doc.docType)}`)
      .join(', ')
    const soonLines = dueSoon
      .slice(0, 6)
      .map((doc) => `${doc.storeCode || '—'} ${documentTypeLabel(doc.docType)}`)
      .join(', ')
    const parts: string[] = []
    if (overdue.length) parts.push(`באיחור (${overdue.length}): ${overdueLines}`)
    if (dueSoon.length) {
      parts.push(`תזכורת חודש מראש (${dueSoon.length}): ${soonLines}`)
    }
    await notifyAri(`מסמכים / כיולים — ${parts.join(' · ')}`)
  }
  logEvent('cron:documents', 'info', 'reminders', {
    overdue: overdue.length,
    dueSoon: dueSoon.length,
  })
  return NextResponse.json({
    ok: true,
    overdue: overdue.map((doc) => ({
      id: doc.id,
      storeCode: doc.storeCode,
      docType: doc.docType,
      owner: doc.owner,
    })),
    dueSoon: dueSoon.map((doc) => ({
      id: doc.id,
      storeCode: doc.storeCode,
      docType: doc.docType,
      owner: doc.owner,
    })),
  })
}
