/**
 * Durable WhatsApp send-failure queue (memory + Supabase).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { supabaseReady } from '@/lib/data/memory-store'
import { logEvent } from '@/lib/logging'
import {
  isNonRetryableWhatsAppMetaError,
  isTransientHttpStatus,
} from './meta-errors'

export type WhatsAppSendKind = 'text' | 'template'

export type WhatsAppFailurePayload = {
  text?: string
  templateName?: string
  languageCode?: string
  bodyParameters?: string[]
}

export type WhatsAppSendFailureRow = {
  id: string
  to_wa_id: string
  purpose: string
  send_kind: WhatsAppSendKind
  payload: WhatsAppFailurePayload
  phone_number_id: string | null
  ticket_id: string | null
  meta_error_code: number | null
  meta_error_message: string | null
  attempts: number
  max_attempts: number
  next_retry_at: string
  status: 'pending' | 'sent' | 'exhausted' | 'cancelled'
  last_error: string | null
}

type MemFailure = WhatsAppSendFailureRow

const memFailures = new Map<string, MemFailure>()

function backoffMinutes(attempts: number): number {
  return Math.min(5 * 2 ** Math.max(0, attempts - 1), 120)
}

export function shouldEnqueueWhatsAppFailure(input: {
  ok: boolean
  dryRun?: boolean
  skippedByPolicy?: boolean
  errorCode?: number | null
  httpStatus?: number
}): boolean {
  if (input.ok || input.dryRun || input.skippedByPolicy) return false
  if (isNonRetryableWhatsAppMetaError(input.errorCode ?? undefined)) {
    return false
  }
  if (input.httpStatus != null && isTransientHttpStatus(input.httpStatus)) {
    return true
  }
  // Network / unknown — enqueue
  if (input.errorCode == null) return true
  // Retryable Meta codes (e.g. temporary)
  return !isNonRetryableWhatsAppMetaError(input.errorCode)
}

export async function enqueueWhatsAppSendFailure(input: {
  toWaId: string
  purpose: string
  sendKind: WhatsAppSendKind
  payload: WhatsAppFailurePayload
  phoneNumberId?: string | null
  ticketId?: string | null
  metaErrorCode?: number | null
  metaErrorMessage?: string | null
  supabase?: SupabaseClient
}): Promise<{ id: string; backend: 'memory' | 'supabase' } | null> {
  const row = {
    to_wa_id: input.toWaId,
    purpose: input.purpose,
    send_kind: input.sendKind,
    payload: input.payload,
    phone_number_id: input.phoneNumberId ?? null,
    ticket_id: input.ticketId ?? null,
    meta_error_code: input.metaErrorCode ?? null,
    meta_error_message: input.metaErrorMessage ?? null,
    attempts: 0,
    max_attempts: 5,
    next_retry_at: new Date().toISOString(),
    status: 'pending' as const,
    last_error: input.metaErrorMessage ?? null,
  }

  if (!(await supabaseReady()) || process.env.MAINTAINOS_FORCE_MEMORY === '1') {
    const id = `mem_wa_fail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    memFailures.set(id, { id, ...row })
    logEvent('whatsapp:retry', 'info', 'enqueued_memory', { id, to: row.to_wa_id })
    return { id, backend: 'memory' }
  }

  const supabase = input.supabase ?? createSystemClient('wa_send_fail_enqueue')
  const { data, error } = await supabase
    .from('whatsapp_send_failures')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      const id = `mem_wa_fail_${Date.now()}`
      memFailures.set(id, { id, ...row })
      return { id, backend: 'memory' }
    }
    logEvent('whatsapp:retry', 'error', 'enqueue_failed', {
      error: error.message,
    })
    return null
  }
  return { id: data.id as string, backend: 'supabase' }
}

export async function listPendingWhatsAppFailures(limit = 40): Promise<{
  rows: WhatsAppSendFailureRow[]
  backend: 'memory' | 'supabase'
}> {
  const now = new Date().toISOString()
  if (!(await supabaseReady()) || process.env.MAINTAINOS_FORCE_MEMORY === '1') {
    const rows = [...memFailures.values()]
      .filter((r) => r.status === 'pending' && r.next_retry_at <= now)
      .slice(0, limit)
    return { rows, backend: 'memory' }
  }

  const supabase = createSystemClient('wa_send_fail_list')
  const { data, error } = await supabase
    .from('whatsapp_send_failures')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', now)
    .order('next_retry_at', { ascending: true })
    .limit(limit)

  if (error) {
    if (isSupabaseSchemaError(error)) {
      const rows = [...memFailures.values()]
        .filter((r) => r.status === 'pending' && r.next_retry_at <= now)
        .slice(0, limit)
      return { rows, backend: 'memory' }
    }
    throw new Error(error.message)
  }
  return {
    rows: (data ?? []) as WhatsAppSendFailureRow[],
    backend: 'supabase',
  }
}

export async function markWhatsAppFailureResult(input: {
  id: string
  ok: boolean
  error?: string | null
  metaErrorCode?: number | null
  backend: 'memory' | 'supabase'
}): Promise<void> {
  if (input.backend === 'memory' || input.id.startsWith('mem_')) {
    const row = memFailures.get(input.id)
    if (!row) return
    if (input.ok) {
      row.status = 'sent'
      memFailures.set(input.id, row)
      return
    }
    row.attempts += 1
    row.last_error = input.error ?? row.last_error
    row.meta_error_code = input.metaErrorCode ?? row.meta_error_code
    if (
      row.attempts >= row.max_attempts ||
      isNonRetryableWhatsAppMetaError(input.metaErrorCode ?? undefined)
    ) {
      row.status = 'exhausted'
    } else {
      const mins = backoffMinutes(row.attempts)
      row.next_retry_at = new Date(Date.now() + mins * 60_000).toISOString()
    }
    memFailures.set(input.id, {
      ...row,
    })
    return
  }

  const supabase = createSystemClient('wa_send_fail_mark')
  if (input.ok) {
    await supabase
      .from('whatsapp_send_failures')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', input.id)
    return
  }

  const { data: existing } = await supabase
    .from('whatsapp_send_failures')
    .select('attempts, max_attempts')
    .eq('id', input.id)
    .maybeSingle()

  const attempts = (existing?.attempts ?? 0) + 1
  const maxAttempts = existing?.max_attempts ?? 5
  const exhausted =
    attempts >= maxAttempts ||
    isNonRetryableWhatsAppMetaError(input.metaErrorCode ?? undefined)
  const mins = backoffMinutes(attempts)

  await supabase
    .from('whatsapp_send_failures')
    .update({
      attempts,
      last_error: input.error ?? null,
      meta_error_code: input.metaErrorCode ?? null,
      status: exhausted ? 'exhausted' : 'pending',
      next_retry_at: exhausted
        ? new Date().toISOString()
        : new Date(Date.now() + mins * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
}

/** Test helper */
export function __resetMemWhatsAppFailures() {
  memFailures.clear()
}
