import type { SupabaseClient } from '@supabase/supabase-js'
import { createSystemClient } from '@/lib/supabase/system'
import {
  isMissingColumnError,
  isMissingTableError,
  isSupabaseSchemaError,
} from '@/lib/supabase/schema-fallback'
import { supabaseReady } from '@/lib/data/memory-store'
import { IL_ORG_ID } from '@/modules/stores/israel-stores'
import {
  getDriveSync,
  listDocuments,
  listFiles,
  listSpends,
  listTasks,
  replacePersistedOps,
  setDriveSync,
} from '@/lib/data/ops-ledger'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function asUuid(value: string | null | undefined): string | null {
  if (!value || !UUID.test(value)) return null
  return value
}

function skipped(err: unknown): boolean {
  return (
    isSupabaseSchemaError(err) ||
    isMissingColumnError(err) ||
    isMissingTableError(err)
  )
}

export async function hydrateOpsLedger(): Promise<void> {
  if (!(await supabaseReady())) return
  try {
    const supabase = createSystemClient('ops_ledger_read')
    const [files, documents, spends, tasks] = await Promise.all([
      supabase.from('ingested_files').select('*').order('created_at', { ascending: false }),
      supabase.from('store_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('spend_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('ops_tasks').select('*').order('created_at', { ascending: false }),
    ])
    if ([files.error, documents.error, spends.error, tasks.error].some(skipped)) return
    if (files.error || documents.error || spends.error || tasks.error) return
    const sync = await supabase.from('drive_sync_state').select('*').eq('id', 'default').maybeSingle()
    if (!sync.error && sync.data) {
      setDriveSync({
        rootFolderId: sync.data.root_folder_id ? String(sync.data.root_folder_id) : null,
        lastSyncAt: sync.data.last_sync_at ? String(sync.data.last_sync_at) : null,
        lastError: sync.data.last_error ? String(sync.data.last_error) : null,
        lastPulled: Number(sync.data.last_pulled ?? 0),
        lastPushed: Number(sync.data.last_pushed ?? 0),
        lastReview: Number(sync.data.last_review ?? 0),
      })
    }
    replacePersistedOps({
      files: (files.data ?? []).map((row) => ({
        id: String(row.client_id || row.id),
        name: String(row.name ?? ''),
        mime: String(row.mime ?? ''),
        sourceUrl: row.source_url ? String(row.source_url) : null,
        stage: (row.stage as 'validate') || 'validate',
        docType: row.doc_type ? String(row.doc_type) : null,
        storeCode: row.store_code ? String(row.store_code) : null,
        extractedText: row.extracted_text ? String(row.extracted_text) : null,
        status: (row.status as 'ingested') || 'needs_review',
        reason: row.reason ? String(row.reason) : null,
        versionOf: row.version_of ? String(row.version_of) : null,
        deletedInSource: Boolean(row.deleted_in_source),
        driveFileId: row.drive_file_id ? String(row.drive_file_id) : null,
        driveModifiedTime: row.drive_modified_time ? String(row.drive_modified_time) : null,
        origin: row.origin === 'maintainos' || row.origin === 'drive' ? row.origin : null,
        localUpdatedAt: row.local_updated_at ? String(row.local_updated_at) : null,
      })),
      documents: (documents.data ?? []).map((row) => ({
        id: String(row.client_id || row.id),
        storeId: row.store_id ? String(row.store_id) : '',
        storeCode: String(row.store_code ?? ''),
        storeName: String(row.store_name ?? ''),
        docType: String(row.doc_type ?? ''),
        sourceUrl: row.source_url ? String(row.source_url) : null,
        extractedExpiry: row.extracted_expiry ? String(row.extracted_expiry) : null,
        computedNextCheck: row.computed_next_check ? String(row.computed_next_check) : null,
        owner: row.owner_name ? String(row.owner_name) : null,
        intakeStatus: (row.intake_status as 'ingested') || 'needs_review',
        intakeReason: row.intake_reason ? String(row.intake_reason) : null,
        version: Number(row.version ?? 1),
        previousId: row.previous_client_id ? String(row.previous_client_id) : null,
        renewed: Boolean(row.renewed),
        createdAt: String(row.created_at),
        driveFileId: row.drive_file_id ? String(row.drive_file_id) : null,
        fieldsLocked: Boolean(row.fields_locked),
        localUpdatedAt: row.local_updated_at ? String(row.local_updated_at) : null,
        originWaId: row.origin_wa_id ? String(row.origin_wa_id) : null,
      })),
      spends: (spends.data ?? []).map((row) => ({
        id: String(row.client_id || row.id),
        storeId: row.store_id ? String(row.store_id) : '',
        storeCode: String(row.store_code ?? ''),
        storeName: String(row.store_name ?? ''),
        ticketId: row.ticket_id ? String(row.ticket_id) : null,
        reason: String(row.reason ?? ''),
        vendorName: row.vendor_name ? String(row.vendor_name) : null,
        requestedAmount: Number(row.requested_amount ?? 0),
        approvedAmount: row.approved_amount == null ? null : Number(row.approved_amount),
        actualAmount: row.actual_amount == null ? null : Number(row.actual_amount),
        scope: row.scope ? String(row.scope) : null,
        status: row.status,
        urgent: Boolean(row.urgent),
        requestedBy: row.requested_by ? String(row.requested_by) : null,
        decidedBy: row.decided_by ? String(row.decided_by) : null,
        decidedAt: row.decided_at ? String(row.decided_at) : null,
        needsReapproval: Boolean(row.needs_reapproval),
        originWaId: row.origin_wa_id ? String(row.origin_wa_id) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at ?? row.created_at),
      })),
      tasks: (tasks.data ?? []).map((row) => ({
        id: String(row.client_id || row.id),
        title: String(row.title ?? ''),
        storeId: row.store_id ? String(row.store_id) : null,
        storeCode: row.store_code ? String(row.store_code) : null,
        assignee: row.assignee ? String(row.assignee) : null,
        dueAt: row.due_at ? String(row.due_at) : null,
        ticketId: row.ticket_id ? String(row.ticket_id) : null,
        documentId: row.document_id ? String(row.document_id) : null,
        spendId: row.spend_id ? String(row.spend_id) : null,
        done: Boolean(row.done),
        needsClarification: Boolean(row.needs_clarification),
        clarification: row.clarification ? String(row.clarification) : null,
        createdAt: String(row.created_at),
      })),
    })
  } catch (err) {
    if (!skipped(err)) throw err
  }
}

export async function persistOpsLedger(): Promise<void> {
  if (!(await supabaseReady())) return
  try {
    const supabase = createSystemClient('ops_ledger_write')
    const files = listFiles().map((file) => ({
      client_id: file.id,
      name: file.name,
      mime: file.mime,
      source_url: file.sourceUrl,
      doc_type: file.docType,
      store_code: file.storeCode,
      status: file.status,
      reason: file.reason,
      version_of: file.versionOf,
      deleted_in_source: file.deletedInSource,
      extracted_text: file.extractedText,
      stage: file.stage,
      drive_file_id: file.driveFileId,
      drive_modified_time: file.driveModifiedTime,
      origin: file.origin,
      local_updated_at: file.localUpdatedAt,
    }))
    const documents = listDocuments().map((doc) => ({
      client_id: doc.id,
      store_id: asUuid(doc.storeId),
      store_code: doc.storeCode,
      store_name: doc.storeName,
      doc_type: doc.docType,
      source_url: doc.sourceUrl,
      extracted_expiry: doc.extractedExpiry,
      computed_next_check: doc.computedNextCheck,
      owner_name: doc.owner,
      intake_status: doc.intakeStatus,
      intake_reason: doc.intakeReason,
      version: doc.version,
      previous_client_id: doc.previousId,
      renewed: doc.renewed,
      drive_file_id: doc.driveFileId ?? null,
      fields_locked: Boolean(doc.fieldsLocked),
      local_updated_at: doc.localUpdatedAt ?? null,
      origin_wa_id: doc.originWaId ?? null,
    }))
    const spends = listSpends().map((spend) => ({
      client_id: spend.id,
      organization_id: IL_ORG_ID,
      store_id: asUuid(spend.storeId),
      store_code: spend.storeCode,
      store_name: spend.storeName,
      ticket_id: asUuid(spend.ticketId),
      reason: spend.reason,
      vendor_name: spend.vendorName,
      requested_amount: spend.requestedAmount,
      approved_amount: spend.approvedAmount,
      actual_amount: spend.actualAmount,
      scope: spend.scope,
      status: spend.status,
      urgent: spend.urgent,
      needs_reapproval: spend.needsReapproval,
      requested_by: spend.requestedBy,
      origin_wa_id: spend.originWaId ?? null,
      decided_by: spend.decidedBy,
      decided_at: spend.decidedAt,
    }))
    const tasks = listTasks().map((task) => ({
      client_id: task.id,
      title: task.title,
      store_id: asUuid(task.storeId),
      store_code: task.storeCode,
      assignee: task.assignee,
      due_at: task.dueAt,
      ticket_id: asUuid(task.ticketId),
      done: task.done,
      needs_clarification: task.needsClarification,
      clarification: task.clarification,
    }))
    await upsertFlexible(supabase, 'ingested_files', files)
    await upsertFlexible(supabase, 'store_documents', documents)
    await upsertFlexible(supabase, 'spend_requests', spends)
    await upsertFlexible(supabase, 'ops_tasks', tasks)
    const sync = getDriveSync()
    if (sync.rootFolderId || sync.lastSyncAt) {
      const wrote = await supabase.from('drive_sync_state').upsert(
        {
          id: 'default',
          root_folder_id: sync.rootFolderId,
          last_sync_at: sync.lastSyncAt,
          last_error: sync.lastError,
          last_pulled: sync.lastPulled,
          last_pushed: sync.lastPushed,
          last_review: sync.lastReview,
        },
        { onConflict: 'id' },
      )
      if (wrote.error && !skipped(wrote.error)) throw wrote.error
    }
  } catch (err) {
    if (!skipped(err)) throw err
  }
}

const OPTIONAL_COLUMNS = [
  'drive_file_id',
  'drive_modified_time',
  'origin',
  'local_updated_at',
  'fields_locked',
  'origin_wa_id',
] as const

async function upsertFlexible(
  supabase: SupabaseClient,
  table: 'ingested_files' | 'store_documents' | 'spend_requests' | 'ops_tasks',
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return
  const drops: Array<readonly string[] | null> = [null, ['origin_wa_id'], OPTIONAL_COLUMNS]
  let lastError: unknown = null
  for (const drop of drops) {
    const body = drop
      ? rows.map((row) => {
          const copy = { ...row }
          for (const key of drop) delete copy[key]
          return copy
        })
      : rows
    const wrote = await supabase.from(table).upsert(body, { onConflict: 'client_id' })
    if (!wrote.error) return
    lastError = wrote.error
    if (skipped(wrote.error)) return
    if (!isMissingColumnError(wrote.error)) throw wrote.error
  }
  if (lastError && !skipped(lastError) && !isMissingColumnError(lastError)) {
    throw lastError
  }
}
