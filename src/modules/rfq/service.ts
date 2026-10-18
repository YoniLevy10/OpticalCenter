import {
  memGetRfqDraft,
  memListRfqDrafts,
  memSaveRfqDraft,
  MEM_ORG_ID,
  supabaseReady,
  type MemRfqDraft,
} from '@/lib/data/memory-store'
import {
  assertDraftOnly,
  captureQuoteRecord,
  createRfqDraftRecord,
} from './draft'
import type {
  CaptureQuoteInput,
  CreateRfqDraftInput,
  RfqDraft,
} from './types'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { createSystemClient } from '@/lib/supabase/system'
import { captureError } from '@/lib/monitoring'

function asDraft(row: MemRfqDraft | RfqDraft): RfqDraft {
  return {
    ...row,
    status: 'draft',
    quotes: row.quotes ?? [],
    document_notes: row.document_notes ?? [],
    recipient_hints: row.recipient_hints ?? [],
    ticket_ids: row.ticket_ids ?? [],
  }
}

function rowToDraft(row: Record<string, unknown>): RfqDraft {
  return asDraft({
    id: String(row.id),
    status: 'draft',
    store_id: (row.store_id as string | null) ?? null,
    store_code: (row.store_code as string | null) ?? null,
    store_name: (row.store_name as string | null) ?? null,
    trade: String(row.trade ?? ''),
    ticket_ids: Array.isArray(row.ticket_ids)
      ? (row.ticket_ids as string[])
      : [],
    document_notes: Array.isArray(row.document_notes)
      ? (row.document_notes as string[])
      : [],
    timing_note: (row.timing_note as string | null) ?? null,
    body_text: String(row.body_text ?? ''),
    recipient_hints: Array.isArray(row.recipient_hints)
      ? (row.recipient_hints as string[])
      : [],
    quotes: Array.isArray(row.quotes)
      ? (row.quotes as RfqDraft['quotes'])
      : [],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    created_by: (row.created_by as string | null) ?? null,
  })
}

export async function listRfqDrafts(opts?: {
  ticketId?: string
}): Promise<{ drafts: RfqDraft[]; backend: 'memory' | 'supabase' }> {
  if (await supabaseReady()) {
    try {
      const supabase = createSystemClient('rfq_drafts_list')
      let query = supabase
        .from('rfq_drafts')
        .select('*')
        .eq('organization_id', MEM_ORG_ID)
        .order('updated_at', { ascending: false })
      if (opts?.ticketId) {
        query = query.contains('ticket_ids', [opts.ticketId])
      }
      const { data, error } = await query
      if (error) {
        if (!isSupabaseSchemaError(error)) throw new Error(error.message)
      } else {
        return {
          drafts: (data ?? []).map((row) =>
            rowToDraft(row as Record<string, unknown>),
          ),
          backend: 'supabase',
        }
      }
    } catch (err) {
      if (!isSupabaseSchemaError(err)) {
        captureError(err, { route: 'rfq.list' })
      }
    }
  }
  return {
    drafts: memListRfqDrafts(opts?.ticketId).map(asDraft),
    backend: 'memory',
  }
}

export async function createRfqDraft(
  input: CreateRfqDraftInput,
): Promise<{ draft: RfqDraft; backend: 'memory' | 'supabase' }> {
  const draft = createRfqDraftRecord(input)
  assertDraftOnly(draft)

  if (await supabaseReady()) {
    try {
      const supabase = createSystemClient('rfq_drafts_create')
      const { data, error } = await supabase
        .from('rfq_drafts')
        .insert({
          id: draft.id,
          organization_id: MEM_ORG_ID,
          status: 'draft',
          store_id: draft.store_id,
          store_code: draft.store_code,
          store_name: draft.store_name,
          trade: draft.trade,
          ticket_ids: draft.ticket_ids,
          document_notes: draft.document_notes,
          timing_note: draft.timing_note,
          body_text: draft.body_text,
          recipient_hints: draft.recipient_hints,
          quotes: draft.quotes,
          created_by: draft.created_by,
          created_at: draft.created_at,
          updated_at: draft.updated_at,
        })
        .select('*')
        .single()
      if (error) {
        if (!isSupabaseSchemaError(error)) throw new Error(error.message)
      } else if (data) {
        return {
          draft: rowToDraft(data as Record<string, unknown>),
          backend: 'supabase',
        }
      }
    } catch (err) {
      if (!isSupabaseSchemaError(err)) {
        captureError(err, { route: 'rfq.create' })
      }
    }
  }

  memSaveRfqDraft(draft)
  return { draft: asDraft(draft), backend: 'memory' }
}

export async function addQuoteToDraft(
  draftId: string,
  input: CaptureQuoteInput,
): Promise<{ draft: RfqDraft; backend: 'memory' | 'supabase' }> {
  const quote = captureQuoteRecord(input)

  if (await supabaseReady()) {
    try {
      const supabase = createSystemClient('rfq_drafts_quote')
      const { data: existing, error: loadErr } = await supabase
        .from('rfq_drafts')
        .select('*')
        .eq('id', draftId)
        .eq('organization_id', MEM_ORG_ID)
        .maybeSingle()
      if (loadErr) {
        if (!isSupabaseSchemaError(loadErr)) throw new Error(loadErr.message)
      } else if (existing) {
        const draft = rowToDraft(existing as Record<string, unknown>)
        assertDraftOnly(draft)
        const next: RfqDraft = {
          ...draft,
          quotes: [...draft.quotes, quote],
          updated_at: new Date().toISOString(),
        }
        const { data, error } = await supabase
          .from('rfq_drafts')
          .update({ quotes: next.quotes, updated_at: next.updated_at })
          .eq('id', draftId)
          .select('*')
          .single()
        if (error) throw new Error(error.message)
        return {
          draft: rowToDraft(data as Record<string, unknown>),
          backend: 'supabase',
        }
      }
    } catch (err) {
      if (!isSupabaseSchemaError(err)) {
        captureError(err, { route: 'rfq.addQuote' })
      }
    }
  }

  const mem = memGetRfqDraft(draftId)
  if (!mem) throw new Error('טיוטת הצעה לא נמצאה')
  assertDraftOnly(mem)
  const next: MemRfqDraft = {
    ...mem,
    quotes: [...mem.quotes, quote],
    updated_at: new Date().toISOString(),
  }
  memSaveRfqDraft(next)
  return { draft: asDraft(next), backend: 'memory' }
}
