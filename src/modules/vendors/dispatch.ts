import { createHmac } from 'node:crypto'
import {
  memFindDispatchByIdempotency,
  memGet,
  memGetVendor,
  memSaveDispatch,
  supabaseReady,
  type MemPartnerDispatch,
} from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { logEvent } from '@/lib/logging'
import { appendEvent, getById } from '@/modules/tickets/service'
import { getVendorSecret } from '@/modules/vendors/service'

type DispatchPayload = {
  ticket_id: string
  display_number: string | null
  store_code: string | null
  store_name: string | null
  description: string
  priority: string
  category: string | null
  note: string | null
  dispatched_at: string
}

function rowToDispatch(row: Record<string, unknown>): MemPartnerDispatch {
  return {
    id: String(row.id),
    ticket_id: String(row.ticket_id),
    vendor_id: String(row.vendor_id),
    idempotency_key: String(row.idempotency_key),
    status: row.status as MemPartnerDispatch['status'],
    request_hmac: String(row.request_hmac ?? ''),
    payload: (row.payload as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

async function postWebhook(
  webhookUrl: string,
  body: string,
  hmac: string,
  idempotencyKey: string,
): Promise<'sent' | 'failed'> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MaintainOS-Signature': hmac,
        'Idempotency-Key': idempotencyKey,
      },
      body,
    })
    logEvent('partner:dispatch', res.ok ? 'info' : 'warn', 'webhook_result', {
      status: res.status,
    })
    return res.ok ? 'sent' : 'failed'
  } catch (err) {
    logEvent('partner:dispatch', 'error', 'webhook_threw', {
      error: err instanceof Error ? err.message : String(err),
    })
    return 'failed'
  }
}

async function dispatchMemory(input: {
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

  const payload: DispatchPayload = {
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
    row.status = await postWebhook(
      vendor.webhook_url,
      body,
      hmac,
      input.idempotencyKey,
    )
    row.updated_at = new Date().toISOString()
  } else {
    row.status = 'sent'
    row.updated_at = new Date().toISOString()
    logEvent('partner:dispatch', 'info', 'stub_sent_no_webhook', {
      vendorId: vendor.id,
      ticketId: ticket.id,
      hmac: hmac.slice(0, 12),
    })
  }

  memSaveDispatch(row)
  await appendEvent(ticket.id, 'partner_dispatched', input.actorId ?? null, {
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    dispatch_id: row.id,
    status: row.status,
    idempotency_key: input.idempotencyKey,
  })
  return row
}

async function dispatchSupabase(input: {
  ticketId: string
  vendorId: string
  idempotencyKey: string
  actorId?: string | null
  note?: string
}): Promise<MemPartnerDispatch> {
  const supabase = createSystemClient('partner_dispatch')

  const { data: existing } = await supabase
    .from('vendor_dispatches')
    .select('*')
    .eq('ticket_id', input.ticketId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle()
  if (existing) return rowToDispatch(existing)

  const ticket = await getById(input.ticketId)
  if (!ticket) throw new Error('תקלה לא נמצאה')
  const vendor = await getVendorSecret(input.vendorId)
  if (!vendor || !vendor.active) throw new Error('ספק לא זמין')

  const payload: DispatchPayload = {
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

  const { data: inserted, error: insertError } = await supabase
    .from('vendor_dispatches')
    .insert({
      ticket_id: ticket.id,
      vendor_id: vendor.id,
      idempotency_key: input.idempotencyKey,
      status: 'queued',
      request_hmac: hmac,
      payload,
    })
    .select('*')
    .single()

  if (insertError) {
    // Race: another writer won the unique (ticket_id, idempotency_key).
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('vendor_dispatches')
        .select('*')
        .eq('ticket_id', input.ticketId)
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle()
      if (raced) return rowToDispatch(raced)
    }
    throw new Error(insertError.message)
  }

  let status: MemPartnerDispatch['status'] = 'queued'
  if (vendor.webhook_url) {
    status = await postWebhook(
      vendor.webhook_url,
      body,
      hmac,
      input.idempotencyKey,
    )
  } else {
    status = 'sent'
    logEvent('partner:dispatch', 'info', 'stub_sent_no_webhook', {
      vendorId: vendor.id,
      ticketId: ticket.id,
      hmac: hmac.slice(0, 12),
    })
  }

  const { data: updated, error: updateError } = await supabase
    .from('vendor_dispatches')
    .update({
      status,
      request_hmac: hmac,
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inserted.id)
    .select('*')
    .single()

  if (updateError) throw new Error(updateError.message)

  await appendEvent(ticket.id, 'partner_dispatched', input.actorId ?? null, {
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    dispatch_id: updated.id,
    status,
    idempotency_key: input.idempotencyKey,
  })

  return rowToDispatch(updated)
}

/**
 * Partner dispatch (Fixly-style façade):
 * - Idempotent by (ticket_id, client key)
 * - HMAC-SHA256 over canonical JSON body
 * - Persists to Supabase when available; memory otherwise
 */
export async function dispatchToVendor(input: {
  ticketId: string
  vendorId: string
  idempotencyKey: string
  actorId?: string | null
  note?: string
}): Promise<MemPartnerDispatch> {
  if (!(await supabaseReady())) {
    return dispatchMemory(input)
  }

  try {
    return await dispatchSupabase(input)
  } catch (err) {
    if (isSupabaseSchemaError(err)) {
      logEvent('partner:dispatch', 'warn', 'schema_fallback_memory', {
        error: err instanceof Error ? err.message : String(err),
      })
      return dispatchMemory(input)
    }
    throw err
  }
}
