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

export type DispatchStatus = MemPartnerDispatch['status']

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

const SCHEMA_HINT =
  'חסרה טבלת vendor_dispatches או עמודות שיגור. הריצו מיגרציות phase6 + 20261017120000_visit_dispatch_reliability.sql ב־Supabase.'

function schemaDurableError(err: unknown): Error {
  const detail = err instanceof Error ? err.message : String(err)
  return new Error(`שמירה ב־DB נכשלה (אין נפילה שקטה לזיכרון): ${detail}. ${SCHEMA_HINT}`)
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
    last_error:
      row.last_error == null || row.last_error === ''
        ? null
        : String(row.last_error),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

async function postWebhook(
  webhookUrl: string,
  body: string,
  hmac: string,
  idempotencyKey: string,
): Promise<{ status: 'sent' | 'failed'; error: string | null }> {
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
    if (res.ok) return { status: 'sent', error: null }
    return {
      status: 'failed',
      error: `webhook HTTP ${res.status}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logEvent('partner:dispatch', 'error', 'webhook_threw', { error: message })
    return { status: 'failed', error: message }
  }
}

/**
 * Delivery outcome when there is no connected vendor channel.
 * Demo and prod both use `labeled` — never claim `sent` as if the vendor received.
 */
function labeledWithoutChannel(vendorId: string, ticketId: string): {
  status: 'labeled'
  error: string | null
} {
  logEvent('partner:dispatch', 'info', 'labeled_no_webhook', {
    vendorId,
    ticketId,
  })
  return { status: 'labeled', error: null }
}

async function deliverToVendorChannel(input: {
  webhookUrl: string | null
  body: string
  hmac: string
  idempotencyKey: string
  vendorId: string
  ticketId: string
}): Promise<{ status: DispatchStatus; error: string | null }> {
  if (input.webhookUrl) {
    return postWebhook(
      input.webhookUrl,
      input.body,
      input.hmac,
      input.idempotencyKey,
    )
  }
  return labeledWithoutChannel(input.vendorId, input.ticketId)
}

function isTerminalSuccess(status: DispatchStatus): boolean {
  return status === 'sent' || status === 'ack' || status === 'labeled'
}

async function dispatchMemory(input: {
  ticketId: string
  vendorId: string
  idempotencyKey: string
  actorId?: string | null
  note?: string
  visitId?: string | null
  retryFailed?: boolean
}): Promise<MemPartnerDispatch> {
  const existing = memFindDispatchByIdempotency(input.idempotencyKey)
  if (existing && !(input.retryFailed && existing.status === 'failed')) {
    return existing
  }

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

  const row: MemPartnerDispatch = existing
    ? {
        ...existing,
        request_hmac: hmac,
        payload,
        status: 'queued',
        last_error: null,
        updated_at: now,
      }
    : {
        id: `dispatch-${crypto.randomUUID()}`,
        ticket_id: ticket.id,
        vendor_id: vendor.id,
        idempotency_key: input.idempotencyKey,
        status: 'queued',
        request_hmac: hmac,
        payload,
        last_error: null,
        created_at: now,
        updated_at: now,
      }

  const delivery = await deliverToVendorChannel({
    webhookUrl: vendor.webhook_url,
    body,
    hmac,
    idempotencyKey: input.idempotencyKey,
    vendorId: vendor.id,
    ticketId: ticket.id,
  })
  row.status = delivery.status
  row.last_error = delivery.error
  row.updated_at = new Date().toISOString()

  memSaveDispatch(row)
  await appendEvent(ticket.id, 'partner_dispatched', input.actorId ?? null, {
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    dispatch_id: row.id,
    status: row.status,
    idempotency_key: input.idempotencyKey,
    visit_id: input.visitId ?? null,
    last_error: row.last_error,
    retry: Boolean(existing),
  })
  return row
}

async function dispatchSupabase(input: {
  ticketId: string
  vendorId: string
  idempotencyKey: string
  actorId?: string | null
  note?: string
  visitId?: string | null
  retryFailed?: boolean
}): Promise<MemPartnerDispatch> {
  const supabase = createSystemClient('partner_dispatch')

  const { data: existing, error: existingError } = await supabase
    .from('vendor_dispatches')
    .select('*')
    .eq('ticket_id', input.ticketId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle()

  if (existingError) {
    if (isSupabaseSchemaError(existingError)) throw schemaDurableError(existingError)
    throw new Error(existingError.message)
  }

  if (
    existing &&
    !(input.retryFailed && String(existing.status) === 'failed')
  ) {
    return rowToDispatch(existing)
  }

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

  let rowId: string
  if (existing) {
    rowId = String(existing.id)
    const { error: resetError } = await supabase
      .from('vendor_dispatches')
      .update({
        status: 'queued',
        request_hmac: hmac,
        payload,
        last_error: null,
        updated_at: new Date().toISOString(),
        ...(input.visitId ? { visit_id: input.visitId } : {}),
      })
      .eq('id', rowId)
    if (resetError) {
      if (isSupabaseSchemaError(resetError)) throw schemaDurableError(resetError)
      throw new Error(resetError.message)
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('vendor_dispatches')
      .insert({
        ticket_id: ticket.id,
        vendor_id: vendor.id,
        idempotency_key: input.idempotencyKey,
        status: 'queued',
        request_hmac: hmac,
        payload,
        last_error: null,
        ...(input.visitId ? { visit_id: input.visitId } : {}),
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: raced } = await supabase
          .from('vendor_dispatches')
          .select('*')
          .eq('ticket_id', input.ticketId)
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle()
        if (raced) return rowToDispatch(raced)
      }
      if (isSupabaseSchemaError(insertError)) throw schemaDurableError(insertError)
      throw new Error(insertError.message)
    }
    rowId = String(inserted.id)
  }

  const delivery = await deliverToVendorChannel({
    webhookUrl: vendor.webhook_url,
    body,
    hmac,
    idempotencyKey: input.idempotencyKey,
    vendorId: vendor.id,
    ticketId: ticket.id,
  })

  const { data: updated, error: updateError } = await supabase
    .from('vendor_dispatches')
    .update({
      status: delivery.status,
      request_hmac: hmac,
      payload,
      last_error: delivery.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId)
    .select('*')
    .single()

  if (updateError) {
    if (isSupabaseSchemaError(updateError)) throw schemaDurableError(updateError)
    throw new Error(updateError.message)
  }

  await appendEvent(ticket.id, 'partner_dispatched', input.actorId ?? null, {
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    dispatch_id: updated.id,
    status: delivery.status,
    idempotency_key: input.idempotencyKey,
    visit_id: input.visitId ?? null,
    last_error: delivery.error,
    retry: Boolean(existing),
  })

  return rowToDispatch(updated)
}

/**
 * Partner dispatch façade:
 * - Idempotent by (ticket_id, client key); failed rows can be redriven with retryFailed
 * - HMAC-SHA256 over canonical JSON body
 * - No webhook → `labeled` (never fake `sent`)
 * - Schema errors in Supabase mode surface — no silent memory pretend-save
 */
export async function dispatchToVendor(input: {
  ticketId: string
  vendorId: string
  idempotencyKey: string
  actorId?: string | null
  note?: string
  visitId?: string | null
  /** Re-attempt delivery when an existing row is `failed`. */
  retryFailed?: boolean
}): Promise<MemPartnerDispatch> {
  const { executionBlockReason } = await import('@/modules/spend/policy')
  const { spendForTicket } = await import('@/lib/data/ops-ledger')
  const block = executionBlockReason(spendForTicket(input.ticketId))
  if (block) throw new Error(block)

  if (!(await supabaseReady())) {
    return dispatchMemory(input)
  }

  try {
    return await dispatchSupabase(input)
  } catch (err) {
    if (isSupabaseSchemaError(err)) throw schemaDurableError(err)
    throw err
  }
}

export function dispatchSucceeded(status: DispatchStatus): boolean {
  return isTerminalSuccess(status)
}
