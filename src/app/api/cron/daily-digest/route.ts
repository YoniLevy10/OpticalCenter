import { NextResponse } from 'next/server'
import { listTickets } from '@/modules/tickets/service'
import { ticketDecision, splitDecisions, type DecisionItem } from '@/modules/decisions/queue'
import { ledgerDecisions } from '@/modules/decisions/from-ledger'
import { buildDailyDigest } from '@/modules/digest/daily'
import { notifyAri } from '@/modules/notify/ari'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { listTasks } from '@/lib/data/ops-ledger'
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
  const { tickets } = await listTickets({ limit: 200 }).catch(() => ({ tickets: [] }))
  const decisions = splitDecisions([
    ...tickets
      .map((ticket) => ticketDecision(ticket))
      .filter((item): item is DecisionItem => item != null),
    ...ledgerDecisions(),
  ])
  const digest = buildDailyDigest({
    decisions: [...decisions.overdue, ...decisions.today],
    openTasks: listTasks().filter((task) => !task.done).length,
  })
  if (digest.headline !== 'אין החלטות דחופות להיום') {
    await notifyAri(`תקציר יומי: ${digest.headline}`)
  }
  logEvent('cron:daily-digest', 'info', 'built', digest)
  return NextResponse.json({ ok: true, digest })
}
