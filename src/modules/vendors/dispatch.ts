import { createHmac } from 'node:crypto'
import {
  memAddEvent,
  memFindDispatchByIdempotency,
  memGet,
  memGetVendor,
  memSaveDispatch,
  type MemPartnerDispatch,
} from '@/lib/data/memory-store'
import { logEvent } from '@/lib/logging'

/**
 * Partner dispatch MVP (Fixly-style façade):
 * - Idempotent by client key
 * - HMAC-SHA256 over canonical JSON body
 * - Queues/sends stub (logs when no webhook_url)
 */
export async function dispatchToVendor(input: {
  ticketId: string
  vendorId: string
  idempotencyKey: string
  actorId?: string | null
  note?: string
}): Promise<MemPartnerDispatch> {
  const existing = memFindDispatchByIdempotency(input.idempotencyKey)
  if (existing) return existing

  const ticket = memGet(input.ticketId)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  const vendor = memGetVendor(input.vendorId)
  if (!vendor || !vendor.active) throw new Error('ספק לא זמין')

  const payload = {
    ticket_id: ticket.id,
    display_number: ticket.display_number,
    store_code: ticket.stores?.code ?? null,
    store_name: ticket.stores?.name ?? null,
    description: ticket.description,
    priority: ticket.priority,
    category: ticket.category,
    note: input.note ?? null,
    dispatched_at: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)
  const secret = vendor.hmac_secret || 'maintainos-demo-partner'
  const hmac = createHmac('sha256', secret).update(body).digest('hex')

  const now = new Date().toISOString()
  const row: MemPartnerDispatch = {
    id: `dispatch-${crypto.randomUUID()}`,
    ticket_id: ticket.id,
    vendor_id: vendor.id,
    idempotency_key: input.idempotencyKey,
    status: 'queued',
    request_hmac: hmac,
    payload,
    created_at: now,
    updated_at: now,
  }

  if (vendor.webhook_url) {
    try {
      const res = await fetch(vendor.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MaintainOS-Signature': hmac,
          'Idempotency-Key': input.idempotencyKey,
        },
        body,
      })
      row.status = res.ok ? 'sent' : 'failed'
      row.updated_at = new Date().toISOString()
      logEvent('partner:dispatch', res.ok ? 'info' : 'warn', 'webhook_result', {
        vendorId: vendor.id,
        ticketId: ticket.id,
        status: res.status,
      })
    } catch (err) {
      row.status = 'failed'
      row.updated_at = new Date().toISOString()
      logEvent('partner:dispatch', 'error', 'webhook_threw', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  } else {
    // Demo: mark sent without network — partner façade ready.
    row.status = 'sent'
    row.updated_at = new Date().toISOString()
    logEvent('partner:dispatch', 'info', 'stub_sent_no_webhook', {
      vendorId: vendor.id,
      ticketId: ticket.id,
      hmac: hmac.slice(0, 12),
    })
  }

  memSaveDispatch(row)
  memAddEvent(
    ticket.id,
    'partner_dispatched',
    {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      dispatch_id: row.id,
      status: row.status,
      idempotency_key: input.idempotencyKey,
    },
    input.actorId ?? null,
  )
  return row
}
