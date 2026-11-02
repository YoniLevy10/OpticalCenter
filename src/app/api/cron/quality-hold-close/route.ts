import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/logging'
import { memListTickets, supabaseReady } from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { captureError } from '@/lib/monitoring'
import { getById, updateStatus } from '@/modules/tickets/service'
import { notifyReporter } from '@/modules/notifications/lifecycle-notify'
import { eligibleForQualityClose } from '@/modules/tickets/quality-hold'

export const runtime = 'nodejs'

/**
 * Close tickets the store already confirmed once the 30-day quality hold ends.
 * Does not close unconfirmed tickets and does not override an active hold.
 */
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

async function loadEligibleIds(now: Date): Promise<string[]> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('quality_hold_close')
    const { data, error } = await supabase
      .from('tickets')
      .select('id, status, store_confirmed_at, quality_hold_until')
      .eq('status', 'resolved')
      .not('store_confirmed_at', 'is', null)
      .not('quality_hold_until', 'is', null)
      .lte('quality_hold_until', now.toISOString())
      .limit(200)
    if (error) throw new Error(error.message)
    return (data ?? [])
      .filter((row) =>
        eligibleForQualityClose(
          {
            status: String(row.status),
            store_confirmed_at: (row.store_confirmed_at as string | null) ?? null,
            quality_hold_until: (row.quality_hold_until as string | null) ?? null,
          },
          now,
        ),
      )
      .map((row) => String(row.id))
  }

  return memListTickets()
    .filter((ticket) => eligibleForQualityClose(ticket, now))
    .map((ticket) => ticket.id)
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let closed = 0
  let failed = 0

  try {
    const ids = await loadEligibleIds(now)
    for (const id of ids) {
      try {
        const updated = await updateStatus(id, 'closed', null)
        const detail = await getById(updated.id)
        if (detail) await notifyReporter(detail, 'closed')
        closed += 1
      } catch (err) {
        failed += 1
        logEvent('cron:quality_hold_close', 'warn', 'ticket_failed', {
          ticketId: id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logEvent('cron:quality_hold_close', 'info', 'done', { closed, failed })
    return NextResponse.json({ ok: true, closed, failed })
  } catch (err) {
    captureError(err, { route: 'GET /api/cron/quality-hold-close' })
    logEvent('cron:quality_hold_close', 'error', 'failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
