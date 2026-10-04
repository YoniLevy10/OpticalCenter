import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import {
  memListProfessionals,
  memTouchProfessional,
  memUpsertProfessional,
  MEM_ORG_ID,
  supabaseReady,
  type MemProfessional,
} from '@/lib/data/memory-store'
import type { Professional, ProfessionalInput } from './types'
import { captureError } from '@/lib/monitoring'

function memoryList(opts?: {
  tradeQuery?: string | null
  limit?: number
}): { professionals: Professional[]; backend: 'memory' } {
  const limit = opts?.limit ?? 40
  return {
    backend: 'memory',
    professionals: memListProfessionals({
      activeOnly: true,
      tradeQuery: opts?.tradeQuery,
    })
      .slice(0, limit)
      .map(toPublic),
  }
}

function toPublic(p: MemProfessional): Professional {
  return {
    id: p.id,
    organization_id: MEM_ORG_ID,
    full_name: p.full_name,
    phone: p.phone,
    trade: p.trade,
    midrag_sector_id: p.midrag_sector_id,
    midrag_service_id: p.midrag_service_id,
    company_name: p.company_name,
    notes: p.notes,
    source: p.source,
    is_active: p.is_active,
    use_count: p.use_count,
    last_contacted_at: p.last_contacted_at,
    created_at: p.created_at,
    updated_at: p.updated_at,
    deleted_at: p.deleted_at,
  }
}

function rowToMem(row: Record<string, unknown>): MemProfessional {
  return {
    id: String(row.id),
    full_name: String(row.full_name),
    phone: (row.phone as string | null) ?? null,
    trade: (row.trade as string | null) ?? null,
    midrag_sector_id:
      row.midrag_sector_id == null ? null : Number(row.midrag_sector_id),
    midrag_service_id:
      row.midrag_service_id == null ? null : Number(row.midrag_service_id),
    company_name: (row.company_name as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    source: (row.source as MemProfessional['source']) || 'manual',
    is_active: row.is_active !== false,
    use_count: Number(row.use_count ?? 0),
    last_contacted_at: (row.last_contacted_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: (row.deleted_at as string | null) ?? null,
  }
}

export async function listProfessionals(opts?: {
  tradeQuery?: string | null
  limit?: number
}): Promise<{ professionals: Professional[]; backend: 'memory' | 'supabase' }> {
  const limit = opts?.limit ?? 40
  if (!(await supabaseReady())) {
    return memoryList(opts)
  }

  try {
    const supabase = createSystemClient('professionals_list')
    // Avoid nullsFirst option — some PostgREST versions reject it and crash the page.
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .eq('organization_id', MEM_ORG_ID)
      .order('use_count', { ascending: false })
      .order('last_contacted_at', { ascending: false })
      .limit(limit)

    if (error) {
      captureError(error, { route: 'professionals_list', schema: isSupabaseSchemaError(error) })
      return memoryList(opts)
    }

    let list = (data ?? []).map((r) =>
      toPublic(rowToMem(r as Record<string, unknown>)),
    )
    const q = (opts?.tradeQuery ?? '').trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          (p.trade ?? '').toLowerCase().includes(q) ||
          p.full_name.toLowerCase().includes(q),
      )
    }
    return { backend: 'supabase', professionals: list }
  } catch (err) {
    // Never lock the אנשי מקצוע screen — Midrag catalog + memory book still work.
    captureError(err, { route: 'professionals_list' })
    return memoryList(opts)
  }
}

export async function upsertProfessional(
  input: ProfessionalInput,
): Promise<{ professional: Professional; backend: 'memory' | 'supabase' }> {
  if (!(await supabaseReady())) {
    return {
      backend: 'memory',
      professional: toPublic(memUpsertProfessional(input)),
    }
  }

  const supabase = createSystemClient('professionals_upsert')
  const phone = input.phone?.replace(/[^\d+]/g, '') || null
  const now = new Date().toISOString()

  if (phone) {
    const { data: existing } = await supabase
      .from('professionals')
      .select('*')
      .eq('organization_id', MEM_ORG_ID)
      .eq('phone', phone)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('professionals')
        .update({
          full_name: input.full_name.trim(),
          trade: input.trade?.trim() || null,
          midrag_sector_id: input.midrag_sector_id ?? null,
          midrag_service_id: input.midrag_service_id ?? null,
          company_name: input.company_name?.trim() || null,
          notes: input.notes?.trim() || null,
          source: input.source ?? existing.source,
          use_count: Number(existing.use_count ?? 0) + 1,
          last_contacted_at: now,
          updated_at: now,
          is_active: true,
        })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) {
        if (isSupabaseSchemaError(error)) {
          return {
            backend: 'memory',
            professional: toPublic(memUpsertProfessional(input)),
          }
        }
        throw error
      }
      return {
        backend: 'supabase',
        professional: toPublic(rowToMem(data as Record<string, unknown>)),
      }
    }
  }

  const { data, error } = await supabase
    .from('professionals')
    .insert({
      organization_id: MEM_ORG_ID,
      full_name: input.full_name.trim(),
      phone,
      trade: input.trade?.trim() || null,
      midrag_sector_id: input.midrag_sector_id ?? null,
      midrag_service_id: input.midrag_service_id ?? null,
      company_name: input.company_name?.trim() || null,
      notes: input.notes?.trim() || null,
      source: input.source ?? 'manual',
      use_count: 1,
      last_contacted_at: now,
    })
    .select('*')
    .single()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return {
        backend: 'memory',
        professional: toPublic(memUpsertProfessional(input)),
      }
    }
    throw error
  }

  return {
    backend: 'supabase',
    professional: toPublic(rowToMem(data as Record<string, unknown>)),
  }
}

export async function touchProfessional(id: string): Promise<{
  professional: Professional | null
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady())) {
    const row = memTouchProfessional(id)
    return {
      backend: 'memory',
      professional: row ? toPublic(row) : null,
    }
  }

  const supabase = createSystemClient('professionals_touch')
  const { data: existing } = await supabase
    .from('professionals')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!existing) {
    const row = memTouchProfessional(id)
    return {
      backend: 'memory',
      professional: row ? toPublic(row) : null,
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('professionals')
    .update({
      use_count: Number(existing.use_count ?? 0) + 1,
      last_contacted_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      const row = memTouchProfessional(id)
      return {
        backend: 'memory',
        professional: row ? toPublic(row) : null,
      }
    }
    throw error
  }

  return {
    backend: 'supabase',
    professional: toPublic(rowToMem(data as Record<string, unknown>)),
  }
}
