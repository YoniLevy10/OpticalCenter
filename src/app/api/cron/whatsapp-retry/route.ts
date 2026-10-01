import { NextResponse } from 'next/server'
import { logEvent } from '@/lib/logging'
import { captureError } from '@/lib/monitoring'
import {
  listPendingWhatsAppFailures,
  markWhatsAppFailureResult,
} from '@/modules/whatsapp/send-failures'
import {
  sendWhatsAppText,
  sendWhatsAppTemplate,
} from '@/modules/whatsapp/send'
import type { OutboundPurpose } from '@/modules/whatsapp/cost-policy'

export const runtime = 'nodejs'

function cronAuthorized(request: Request): boolean {
  if (process.env.MAINTAINOS_FORCE_MEMORY === '1') return true
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  if (request.headers.get('x-cron-secret') === secret) return true
  if (request.headers.get('cron-secret') === secret) return true
  return false
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows, backend } = await listPendingWhatsAppFailures(40)
    let sent = 0
    let failed = 0
    let exhausted = 0

    for (const row of rows) {
      const purpose = (row.purpose || 'ops_reply') as OutboundPurpose
      let result: Awaited<ReturnType<typeof sendWhatsAppText>>

      if (row.send_kind === 'template') {
        result = await sendWhatsAppTemplate({
          toWaId: row.to_wa_id,
          templateName: row.payload.templateName || '',
          languageCode: row.payload.languageCode,
          bodyParameters: row.payload.bodyParameters,
          phoneNumberId: row.phone_number_id,
          ticketId: row.ticket_id,
          purpose,
          skipFailureQueue: true,
        })
      } else {
        result = await sendWhatsAppText({
          toWaId: row.to_wa_id,
          text: row.payload.text || '',
          phoneNumberId: row.phone_number_id,
          ticketId: row.ticket_id,
          purpose,
          skipFailureQueue: true,
        })
      }

      await markWhatsAppFailureResult({
        id: row.id,
        ok: Boolean(result.ok && !result.dryRun),
        error: result.error,
        metaErrorCode: result.errorCode,
        backend,
      })

      if (result.ok && !result.dryRun) sent += 1
      else failed += 1
    }

    logEvent('cron:whatsapp-retry', 'info', 'done', {
      backend,
      pending: rows.length,
      sent,
      failed,
      exhausted,
    })

    return NextResponse.json({
      ok: true,
      backend,
      pending: rows.length,
      sent,
      failed,
    })
  } catch (err) {
    captureError(err, { route: 'GET /api/cron/whatsapp-retry' })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'retry failed' },
      { status: 500 },
    )
  }
}
