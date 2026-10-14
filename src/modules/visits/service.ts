import { createSystemClient } from '@/lib/supabase/system'
import {
  MEM_ORG_ID,
  memGet,
  memFindStoreById,
  supabaseReady,
} from '@/lib/data/memory-store'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { logEvent } from '@/lib/logging'
import { appendEvent, getById } from '@/modules/tickets/service'
import { dispatchToVendor } from '@/modules/vendors/dispatch'

export type ServiceVisit = {
  id: string
  organization_id: string
  store_id: string
  vendor_id: string | null
  status: string
  scheduled_at: string | null
  created_by: string | null
  notes: string | null
  created_at: string
  ticket_ids: string[]
  dispatch_ids: string[]
}

type MemVisit = ServiceVisit

const memVisits = new Map<string, MemVisit>()

export function memListVisits(): MemVisit[] {
  return [...memVisits.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function memGetVisit(id: string): MemVisit | undefined {
  return memVisits.get(id)
}

export type CreateServiceVisitInput = {
  storeId: string
  ticketIds: string[]
  vendorId: string
  actorId?: string | null
  notes?: string | null
  scheduledAt?: string | null
}

/**
 * Create a service visit for one store + multiple tickets, then dispatch
 * each ticket to the vendor under the shared visit_id.
 */
export async function createServiceVisit(
  input: CreateServiceVisitInput,
): Promise<ServiceVisit> {
  const ticketIds = [...new Set(input.ticketIds.map((id) => id.trim()).filter(Boolean))]
  if (ticketIds.length === 0) {
    throw new Error('יש לבחור לפחות תקלה אחת')
  }
  if (!input.storeId?.trim()) throw new Error('חנות נדרשת')
  if (!input.vendorId?.trim()) throw new Error('ספק נדרש')

  // Validate all tickets belong to the same store.
  const tickets = await Promise.all(ticketIds.map((id) => getById(id)))
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i]
    if (!t) throw new Error(`תקלה לא נמצאה: ${ticketIds[i]}`)
    if (t.store_id !== input.storeId) {
      throw new Error('כל התקלות חייבות להיות מאותה חנות')
    }
  }

  const orgId = tickets[0]?.organization_id ?? MEM_ORG_ID

  if (!(await supabaseReady())) {
    return createVisitMemory({ ...input, ticketIds, orgId })
  }

  try {
    return await createVisitSupabase({ ...input, ticketIds, orgId })
  } catch (err) {
    if (isSupabaseSchemaError(err)) {
      logEvent('visits', 'warn', 'schema_fallback_memory', {
        error: err instanceof Error ? err.message : String(err),
      })
      return createVisitMemory({ ...input, ticketIds, orgId })
    }
    throw err
  }
}

async function createVisitMemory(input: {
  storeId: string
  ticketIds: string[]
  vendorId: string
  actorId?: string | null
  notes?: string | null
  scheduledAt?: string | null
  orgId: string
}): Promise<ServiceVisit> {
  const store = memFindStoreById(input.storeId)
  if (!store && !memGet(input.ticketIds[0])) {
    // Store may only exist via ticket join in memory demos.
  }

  const now = new Date().toISOString()
  const visit: MemVisit = {
    id: `visit-${crypto.randomUUID()}`,
    organization_id: input.orgId,
    store_id: input.storeId,
    vendor_id: input.vendorId,
    status: 'dispatched',
    scheduled_at: input.scheduledAt ?? null,
    created_by: input.actorId ?? null,
    notes: input.notes ?? null,
    created_at: now,
    ticket_ids: input.ticketIds,
    dispatch_ids: [],
  }

  for (const ticketId of input.ticketIds) {
    const dispatch = await dispatchToVendor({
      ticketId,
      vendorId: input.vendorId,
      idempotencyKey: `visit:${visit.id}:${ticketId}`,
      actorId: input.actorId,
      note: input.notes ?? undefined,
      visitId: visit.id,
    })
    visit.dispatch_ids.push(dispatch.id)
    await appendEvent(ticketId, 'service_visit_created', input.actorId ?? null, {
      visit_id: visit.id,
      vendor_id: input.vendorId,
      ticket_count: input.ticketIds.length,
    })
  }

  memVisits.set(visit.id, visit)
  return visit
}

async function createVisitSupabase(input: {
  storeId: string
  ticketIds: string[]
  vendorId: string
  actorId?: string | null
  notes?: string | null
  scheduledAt?: string | null
  orgId: string
}): Promise<ServiceVisit> {
  const supabase = createSystemClient('service_visits')

  const { data: visitRow, error: visitError } = await supabase
    .from('service_visits')
    .insert({
      organization_id: input.orgId,
      store_id: input.storeId,
      vendor_id: input.vendorId,
      status: 'planned',
      scheduled_at: input.scheduledAt ?? null,
      created_by: input.actorId ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (visitError) throw new Error(visitError.message)

  const visitId = String(visitRow.id)
  const { error: linkError } = await supabase
    .from('service_visit_tickets')
    .insert(
      input.ticketIds.map((ticket_id) => ({
        visit_id: visitId,
        ticket_id,
      })),
    )
  if (linkError) throw new Error(linkError.message)

  const dispatchIds: string[] = []
  for (const ticketId of input.ticketIds) {
    const dispatch = await dispatchToVendor({
      ticketId,
      vendorId: input.vendorId,
      idempotencyKey: `visit:${visitId}:${ticketId}`,
      actorId: input.actorId,
      note: input.notes ?? undefined,
      visitId,
    })
    dispatchIds.push(dispatch.id)
    await appendEvent(ticketId, 'service_visit_created', input.actorId ?? null, {
      visit_id: visitId,
      vendor_id: input.vendorId,
      ticket_count: input.ticketIds.length,
    })
  }

  await supabase
    .from('service_visits')
    .update({
      status: 'dispatched',
      updated_at: new Date().toISOString(),
    })
    .eq('id', visitId)

  return {
    id: visitId,
    organization_id: String(visitRow.organization_id),
    store_id: String(visitRow.store_id),
    vendor_id: visitRow.vendor_id ? String(visitRow.vendor_id) : null,
    status: 'dispatched',
    scheduled_at: visitRow.scheduled_at ? String(visitRow.scheduled_at) : null,
    created_by: visitRow.created_by ? String(visitRow.created_by) : null,
    notes: visitRow.notes ? String(visitRow.notes) : null,
    created_at: String(visitRow.created_at),
    ticket_ids: input.ticketIds,
    dispatch_ids: dispatchIds,
  }
}
