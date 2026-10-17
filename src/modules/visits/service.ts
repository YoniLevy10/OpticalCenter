import { createSystemClient } from '@/lib/supabase/system'
import {
  MEM_ORG_ID,
  memFindDispatchByIdempotency,
  memFindStoreById,
  memGetVendor,
  memListDispatches,
  supabaseReady,
} from '@/lib/data/memory-store'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { logEvent } from '@/lib/logging'
import { appendEvent, getById } from '@/modules/tickets/service'
import { dispatchToVendor } from '@/modules/vendors/dispatch'
import { getVendorSecret } from '@/modules/vendors/service'
import { executionBlockReason } from '@/modules/spend/policy'
import { spendForTicket } from '@/lib/data/ops-ledger'

export type VisitItemOutcome = {
  ticket_id: string
  display_number: string | null
  status: 'sent' | 'labeled' | 'failed' | 'ack' | 'queued' | 'blocked'
  dispatch_id: string | null
  error: string | null
  can_retry: boolean
}

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
  idempotency_key: string | null
  ticket_ids: string[]
  dispatch_ids: string[]
  items: VisitItemOutcome[]
}

type MemVisit = ServiceVisit

const memVisits = new Map<string, MemVisit>()

const SCHEMA_HINT =
  'חסרה טבלת service_visits. הריצו מיגרציה 20261014180000_service_visits.sql (+ 20261017120000_visit_dispatch_reliability.sql) ב־Supabase.'

function schemaDurableError(err: unknown): Error {
  const detail = err instanceof Error ? err.message : String(err)
  return new Error(
    `שמירה ב־DB נכשלה (אין נפילה שקטה לזיכרון): ${detail}. ${SCHEMA_HINT}`,
  )
}

export function memListVisits(): MemVisit[] {
  return [...memVisits.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function memGetVisit(id: string): MemVisit | undefined {
  return memVisits.get(id)
}

export function memFindVisitByIdempotency(
  orgId: string,
  key: string,
): MemVisit | undefined {
  return [...memVisits.values()].find(
    (v) => v.organization_id === orgId && v.idempotency_key === key,
  )
}

export type CreateServiceVisitInput = {
  storeId: string
  ticketIds: string[]
  vendorId: string
  actorId?: string | null
  notes?: string | null
  scheduledAt?: string | null
  /** Client key — same key returns existing visit; with retryFailedOnly redrives failures. */
  idempotencyKey?: string | null
  /** Only redispatch tickets whose prior outcome failed/blocked. */
  retryFailedOnly?: boolean
  /** Optional subset when retrying specific failed tickets. */
  retryTicketIds?: string[] | null
}

/** Active + specialty fit (coverage is suggestion-only; Ari may override region). */
function vendorSpecialtyFits(
  specialties: string,
  category: string | null | undefined,
): boolean {
  const specs = specialties
    .split(/[,|]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const cat = (category || 'other').trim().toLowerCase()
  return (
    specs.includes(cat) ||
    specs.includes('general') ||
    specs.includes('other')
  )
}

function vendorMatchesTickets(
  vendor: {
    specialties: string
    active: boolean
  },
  tickets: { category: string | null }[],
): boolean {
  if (!vendor.active) return false
  return tickets.some((t) => vendorSpecialtyFits(vendor.specialties, t.category))
}

function outcomeFromDispatch(input: {
  ticketId: string
  displayNumber: string | null
  dispatch: {
    id: string
    status: string
    last_error?: string | null
  }
}): VisitItemOutcome {
  const status = input.dispatch.status as VisitItemOutcome['status']
  return {
    ticket_id: input.ticketId,
    display_number: input.displayNumber,
    status,
    dispatch_id: input.dispatch.id,
    error: input.dispatch.last_error ?? null,
    can_retry: status === 'failed',
  }
}

function visitStatusFromItems(items: VisitItemOutcome[]): string {
  if (items.length === 0) return 'planned'
  const ok = items.every(
    (i) =>
      i.status === 'sent' ||
      i.status === 'labeled' ||
      i.status === 'ack',
  )
  if (ok) return 'dispatched'
  const anyOk = items.some(
    (i) =>
      i.status === 'sent' ||
      i.status === 'labeled' ||
      i.status === 'ack',
  )
  return anyOk ? 'partial' : 'partial'
}

/**
 * Create a service visit for one store + multiple tickets, then dispatch
 * each ticket to the vendor under the shared visit_id.
 */
export async function createServiceVisit(
  input: CreateServiceVisitInput,
): Promise<ServiceVisit> {
  const ticketIds = [
    ...new Set(input.ticketIds.map((id) => id.trim()).filter(Boolean)),
  ]
  if (ticketIds.length === 0) {
    throw new Error('יש לבחור לפחות תקלה אחת')
  }
  if (!input.storeId?.trim()) throw new Error('חנות נדרשת')
  if (!input.vendorId?.trim()) throw new Error('ספק נדרש')

  const tickets = await Promise.all(ticketIds.map((id) => getById(id)))
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i]
    if (!t) throw new Error(`תקלה לא נמצאה: ${ticketIds[i]}`)
    if (t.store_id !== input.storeId) {
      throw new Error('כל התקלות חייבות להיות מאותה חנות')
    }
  }

  const orgId = tickets[0]?.organization_id ?? MEM_ORG_ID

  // Active + specialty-suitable vendor
  const vendor =
    (await supabaseReady())
      ? await getVendorSecret(input.vendorId)
      : memGetVendor(input.vendorId)
  if (!vendor || !vendor.active) {
    throw new Error('ספק לא זמין')
  }
  if (
    !vendorMatchesTickets(
      vendor,
      tickets.map((t) => ({ category: t!.category })),
    )
  ) {
    throw new Error('הספק אינו מתאים לסוג התקלות שנבחרו')
  }

  const idempotencyKey = input.idempotencyKey?.trim() || null

  if (!(await supabaseReady())) {
    return createVisitMemory({
      ...input,
      ticketIds,
      orgId,
      idempotencyKey,
      tickets: tickets as NonNullable<(typeof tickets)[number]>[],
    })
  }

  try {
    return await createVisitSupabase({
      ...input,
      ticketIds,
      orgId,
      idempotencyKey,
      tickets: tickets as NonNullable<(typeof tickets)[number]>[],
    })
  } catch (err) {
    if (isSupabaseSchemaError(err)) throw schemaDurableError(err)
    throw err
  }
}

async function dispatchVisitTickets(input: {
  visitId: string
  vendorId: string
  actorId?: string | null
  notes?: string | null
  tickets: {
    id: string
    display_number: string | null
    number?: number | null
  }[]
  ticketIdsToDispatch: string[]
  retryFailed: boolean
}): Promise<VisitItemOutcome[]> {
  const items: VisitItemOutcome[] = []
  const dispatchSet = new Set(input.ticketIdsToDispatch)

  for (const ticket of input.tickets) {
    if (!dispatchSet.has(ticket.id)) {
      // Preserve prior outcome from memory/supabase dispatch row when skipping
      const priorKey = `visit:${input.visitId}:${ticket.id}`
      const prior = memFindDispatchByIdempotency(priorKey)
      if (prior) {
        items.push(
          outcomeFromDispatch({
            ticketId: ticket.id,
            displayNumber: ticket.display_number,
            dispatch: prior,
          }),
        )
        continue
      }
      items.push({
        ticket_id: ticket.id,
        display_number: ticket.display_number,
        status: 'queued',
        dispatch_id: null,
        error: null,
        can_retry: false,
      })
      continue
    }

    const block = executionBlockReason(spendForTicket(ticket.id))
    if (block) {
      items.push({
        ticket_id: ticket.id,
        display_number: ticket.display_number,
        status: 'blocked',
        dispatch_id: null,
        error: block,
        can_retry: true,
      })
      continue
    }

    try {
      const dispatch = await dispatchToVendor({
        ticketId: ticket.id,
        vendorId: input.vendorId,
        idempotencyKey: `visit:${input.visitId}:${ticket.id}`,
        actorId: input.actorId,
        note: input.notes ?? undefined,
        visitId: input.visitId,
        retryFailed: input.retryFailed,
      })
      items.push(
        outcomeFromDispatch({
          ticketId: ticket.id,
          displayNumber: ticket.display_number,
          dispatch,
        }),
      )
      await appendEvent(
        ticket.id,
        input.retryFailed ? 'service_visit_retry' : 'service_visit_created',
        input.actorId ?? null,
        {
          visit_id: input.visitId,
          vendor_id: input.vendorId,
          ticket_count: input.tickets.length,
          dispatch_status: dispatch.status,
        },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      items.push({
        ticket_id: ticket.id,
        display_number: ticket.display_number,
        status: 'failed',
        dispatch_id: null,
        error: message,
        can_retry: true,
      })
    }
  }

  return items
}

async function createVisitMemory(input: {
  storeId: string
  ticketIds: string[]
  vendorId: string
  actorId?: string | null
  notes?: string | null
  scheduledAt?: string | null
  orgId: string
  idempotencyKey: string | null
  retryFailedOnly?: boolean
  retryTicketIds?: string[] | null
  tickets: {
    id: string
    display_number: string | null
    number?: number | null
  }[]
}): Promise<ServiceVisit> {
  void memFindStoreById(input.storeId)

  if (input.idempotencyKey) {
    const existing = memFindVisitByIdempotency(input.orgId, input.idempotencyKey)
    if (existing) {
      if (!input.retryFailedOnly) return existing
      const retryIds =
        input.retryTicketIds?.length
          ? input.retryTicketIds
          : existing.items.filter((i) => i.can_retry).map((i) => i.ticket_id)
      const items = await dispatchVisitTickets({
        visitId: existing.id,
        vendorId: input.vendorId,
        actorId: input.actorId,
        notes: input.notes,
        tickets: input.tickets,
        ticketIdsToDispatch: retryIds,
        retryFailed: true,
      })
      // Merge: keep non-retried successes, replace retried
      const byId = new Map(existing.items.map((i) => [i.ticket_id, i]))
      for (const item of items) {
        if (retryIds.includes(item.ticket_id)) byId.set(item.ticket_id, item)
      }
      const merged = input.ticketIds.map(
        (id) =>
          byId.get(id) ?? {
            ticket_id: id,
            display_number: null,
            status: 'failed' as const,
            dispatch_id: null,
            error: 'חסר תוצאה',
            can_retry: true,
          },
      )
      existing.items = merged
      existing.dispatch_ids = merged
        .map((i) => i.dispatch_id)
        .filter((id): id is string => Boolean(id))
      existing.status = visitStatusFromItems(merged)
      memVisits.set(existing.id, existing)
      return existing
    }
  }

  const now = new Date().toISOString()
  const visit: MemVisit = {
    id: `visit-${crypto.randomUUID()}`,
    organization_id: input.orgId,
    store_id: input.storeId,
    vendor_id: input.vendorId,
    status: 'planned',
    scheduled_at: input.scheduledAt ?? null,
    created_by: input.actorId ?? null,
    notes: input.notes ?? null,
    created_at: now,
    idempotency_key: input.idempotencyKey,
    ticket_ids: input.ticketIds,
    dispatch_ids: [],
    items: [],
  }

  const items = await dispatchVisitTickets({
    visitId: visit.id,
    vendorId: input.vendorId,
    actorId: input.actorId,
    notes: input.notes,
    tickets: input.tickets,
    ticketIdsToDispatch: input.ticketIds,
    retryFailed: false,
  })

  visit.items = items
  visit.dispatch_ids = items
    .map((i) => i.dispatch_id)
    .filter((id): id is string => Boolean(id))
  visit.status = visitStatusFromItems(items)
  memVisits.set(visit.id, visit)
  return visit
}

async function loadVisitItemsFromDb(
  visitId: string,
  ticketIds: string[],
  tickets: { id: string; display_number: string | null }[],
): Promise<VisitItemOutcome[]> {
  const supabase = createSystemClient('service_visits')
  const { data, error } = await supabase
    .from('vendor_dispatches')
    .select('id, ticket_id, status, last_error')
    .eq('visit_id', visitId)

  if (error) {
    if (isSupabaseSchemaError(error)) throw schemaDurableError(error)
    throw new Error(error.message)
  }

  const byTicket = new Map(
    (data ?? []).map((row) => [String(row.ticket_id), row]),
  )
  return ticketIds.map((ticketId) => {
    const ticket = tickets.find((t) => t.id === ticketId)
    const row = byTicket.get(ticketId)
    if (!row) {
      return {
        ticket_id: ticketId,
        display_number: ticket?.display_number ?? null,
        status: 'failed' as const,
        dispatch_id: null,
        error: 'לא נוצר שיגור',
        can_retry: true,
      }
    }
    return outcomeFromDispatch({
      ticketId,
      displayNumber: ticket?.display_number ?? null,
      dispatch: {
        id: String(row.id),
        status: String(row.status),
        last_error: row.last_error ? String(row.last_error) : null,
      },
    })
  })
}

async function createVisitSupabase(input: {
  storeId: string
  ticketIds: string[]
  vendorId: string
  actorId?: string | null
  notes?: string | null
  scheduledAt?: string | null
  orgId: string
  idempotencyKey: string | null
  retryFailedOnly?: boolean
  retryTicketIds?: string[] | null
  tickets: {
    id: string
    display_number: string | null
    number?: number | null
  }[]
}): Promise<ServiceVisit> {
  const supabase = createSystemClient('service_visits')

  if (input.idempotencyKey) {
    const { data: existing, error: findError } = await supabase
      .from('service_visits')
      .select('*')
      .eq('organization_id', input.orgId)
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle()

    if (findError) {
      if (isSupabaseSchemaError(findError)) throw schemaDurableError(findError)
      throw new Error(findError.message)
    }

    if (existing) {
      const visitId = String(existing.id)
      let items = await loadVisitItemsFromDb(
        visitId,
        input.ticketIds,
        input.tickets,
      )

      if (input.retryFailedOnly) {
        const retryIds =
          input.retryTicketIds?.length
            ? input.retryTicketIds
            : items.filter((i) => i.can_retry).map((i) => i.ticket_id)

        const retried = await dispatchVisitTickets({
          visitId,
          vendorId: input.vendorId,
          actorId: input.actorId,
          notes: input.notes,
          tickets: input.tickets,
          ticketIdsToDispatch: retryIds,
          retryFailed: true,
        })
        const byId = new Map(items.map((i) => [i.ticket_id, i]))
        for (const item of retried) {
          if (retryIds.includes(item.ticket_id)) byId.set(item.ticket_id, item)
        }
        items = input.ticketIds.map(
          (id) =>
            byId.get(id) ?? {
              ticket_id: id,
              display_number: null,
              status: 'failed' as const,
              dispatch_id: null,
              error: 'חסר תוצאה',
              can_retry: true,
            },
        )
        const status = visitStatusFromItems(items)
        await supabase
          .from('service_visits')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', visitId)
      }

      return {
        id: visitId,
        organization_id: String(existing.organization_id),
        store_id: String(existing.store_id),
        vendor_id: existing.vendor_id ? String(existing.vendor_id) : null,
        status: visitStatusFromItems(items),
        scheduled_at: existing.scheduled_at
          ? String(existing.scheduled_at)
          : null,
        created_by: existing.created_by ? String(existing.created_by) : null,
        notes: existing.notes ? String(existing.notes) : null,
        created_at: String(existing.created_at),
        idempotency_key: existing.idempotency_key
          ? String(existing.idempotency_key)
          : null,
        ticket_ids: input.ticketIds,
        dispatch_ids: items
          .map((i) => i.dispatch_id)
          .filter((id): id is string => Boolean(id)),
        items,
      }
    }
  }

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
      ...(input.idempotencyKey
        ? { idempotency_key: input.idempotencyKey }
        : {}),
    })
    .select('*')
    .single()

  if (visitError) {
    if (visitError.code === '23505' && input.idempotencyKey) {
      // Race: another request created the visit — re-enter idempotent path
      return createVisitSupabase(input)
    }
    if (isSupabaseSchemaError(visitError)) throw schemaDurableError(visitError)
    throw new Error(visitError.message)
  }

  const visitId = String(visitRow.id)
  const { error: linkError } = await supabase
    .from('service_visit_tickets')
    .insert(
      input.ticketIds.map((ticket_id) => ({
        visit_id: visitId,
        ticket_id,
      })),
    )
  if (linkError) {
    if (isSupabaseSchemaError(linkError)) throw schemaDurableError(linkError)
    throw new Error(linkError.message)
  }

  const items = await dispatchVisitTickets({
    visitId,
    vendorId: input.vendorId,
    actorId: input.actorId,
    notes: input.notes,
    tickets: input.tickets,
    ticketIdsToDispatch: input.ticketIds,
    retryFailed: false,
  })

  const status = visitStatusFromItems(items)
  const { error: statusError } = await supabase
    .from('service_visits')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', visitId)

  if (statusError) {
    logEvent('visits', 'warn', 'status_update_failed', {
      error: statusError.message,
      visitId,
    })
  }

  return {
    id: visitId,
    organization_id: String(visitRow.organization_id),
    store_id: String(visitRow.store_id),
    vendor_id: visitRow.vendor_id ? String(visitRow.vendor_id) : null,
    status,
    scheduled_at: visitRow.scheduled_at ? String(visitRow.scheduled_at) : null,
    created_by: visitRow.created_by ? String(visitRow.created_by) : null,
    notes: visitRow.notes ? String(visitRow.notes) : null,
    created_at: String(visitRow.created_at),
    idempotency_key: input.idempotencyKey,
    ticket_ids: input.ticketIds,
    dispatch_ids: items
      .map((i) => i.dispatch_id)
      .filter((id): id is string => Boolean(id)),
    items,
  }
}

/** Preview spend blocks for selected tickets (UI confirmation). */
export function spendBlocksForTickets(
  ticketIds: string[],
): { ticketId: string; block: string | null }[] {
  return ticketIds.map((ticketId) => ({
    ticketId,
    block: executionBlockReason(spendForTicket(ticketId)),
  }))
}

/** Test helper — clear in-memory visits between cases. */
export function memResetVisits(): void {
  memVisits.clear()
}

/** Expose linked dispatches for tests. */
export function memVisitDispatches(visitId: string) {
  return memListDispatches().filter(
    (d) => d.idempotency_key.startsWith(`visit:${visitId}:`),
  )
}
