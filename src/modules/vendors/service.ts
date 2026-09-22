import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import {
  memCreateVendor,
  memGetVendor,
  memListVendors,
  memUpdateVendor,
  MEM_ORG_ID,
  supabaseReady,
  type MemVendor,
} from '@/lib/data/memory-store'
import { matchPreferredVendors, type VendorMatch } from './match'

export type VendorPublic = Omit<MemVendor, 'hmac_secret'> & {
  has_hmac: boolean
}

function toPublic(v: MemVendor): VendorPublic {
  const { hmac_secret, ...rest } = v
  return {
    ...rest,
    preferred: Boolean(v.preferred),
    coverage_regions: v.coverage_regions ?? [],
    notes: v.notes ?? null,
    has_hmac: Boolean(hmac_secret),
  }
}

function rowToMem(row: Record<string, unknown>): MemVendor {
  const regions = Array.isArray(row.coverage_regions)
    ? (row.coverage_regions as string[])
    : typeof row.coverage_regions === 'string'
      ? (row.coverage_regions as string)
          .replace(/[{}]/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  return {
    id: String(row.id),
    name: String(row.name),
    contact_phone: (row.contact_phone as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    specialties: String(row.specialties ?? 'general'),
    active: Boolean(row.active),
    webhook_url: (row.webhook_url as string | null) ?? null,
    hmac_secret: (row.hmac_secret as string | null) ?? null,
    preferred: Boolean(row.preferred),
    coverage_regions: regions.map((c) => c.toUpperCase()),
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
  }
}

export async function listVendors(opts?: {
  activeOnly?: boolean
  preferredOnly?: boolean
}): Promise<{ vendors: VendorPublic[]; backend: 'memory' | 'supabase' }> {
  if (!(await supabaseReady())) {
    let list = memListVendors(opts?.activeOnly)
    if (opts?.preferredOnly) list = list.filter((v) => v.preferred)
    return {
      backend: 'memory',
      vendors: list.map(toPublic),
    }
  }

  const supabase = createSystemClient('vendors_list')
  let query = supabase
    .from('vendors')
    .select('*')
    .eq('organization_id', MEM_ORG_ID)
    .order('name', { ascending: true })

  if (opts?.activeOnly) query = query.eq('active', true)
  if (opts?.preferredOnly) query = query.eq('preferred', true)

  const { data, error } = await query
  if (error) {
    if (isSupabaseSchemaError(error)) {
      let list = memListVendors(opts?.activeOnly)
      if (opts?.preferredOnly) list = list.filter((v) => v.preferred)
      return {
        backend: 'memory',
        vendors: list.map(toPublic),
      }
    }
    throw new Error(error.message)
  }

  return {
    backend: 'supabase',
    vendors: (data ?? []).map((row) => toPublic(rowToMem(row))),
  }
}

export async function suggestVendorsForTicket(input: {
  category: string
  regionId?: string | null
}): Promise<{ matches: VendorMatch[]; backend: 'memory' | 'supabase' }> {
  const { vendors, backend } = await listVendors({ activeOnly: true })
  const matches = matchPreferredVendors(vendors, {
    category: input.category,
    regionIdOrCode: input.regionId,
  })
  return { matches, backend }
}

export async function createVendor(input: {
  name: string
  contact_phone?: string | null
  contact_email?: string | null
  specialties?: string
  webhook_url?: string | null
  preferred?: boolean
  coverage_regions?: string[]
  notes?: string | null
}): Promise<VendorPublic> {
  if (!(await supabaseReady())) {
    return toPublic(memCreateVendor(input))
  }

  const supabase = createSystemClient('vendors_create')
  const hmac = `secret-${crypto.randomUUID().slice(0, 12)}`
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      organization_id: MEM_ORG_ID,
      name: input.name.trim(),
      contact_phone: input.contact_phone?.trim() || null,
      contact_email: input.contact_email?.trim() || null,
      specialties: input.specialties?.trim() || 'general',
      webhook_url: input.webhook_url?.trim() || null,
      hmac_secret: hmac,
      preferred: Boolean(input.preferred),
      coverage_regions: (input.coverage_regions ?? []).map((c) =>
        c.toUpperCase(),
      ),
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return toPublic(memCreateVendor(input))
    }
    throw new Error(error.message)
  }
  return toPublic(rowToMem(data))
}

export async function updateVendor(
  id: string,
  patch: {
    name?: string
    contact_phone?: string | null
    contact_email?: string | null
    specialties?: string
    active?: boolean
    webhook_url?: string | null
    preferred?: boolean
    coverage_regions?: string[]
    notes?: string | null
  },
): Promise<VendorPublic> {
  if (!(await supabaseReady())) {
    return toPublic(memUpdateVendor(id, patch))
  }

  const supabase = createSystemClient('vendors_update')
  const payload: Record<string, unknown> = {}
  if (patch.name != null) payload.name = patch.name.trim()
  if (patch.contact_phone !== undefined)
    payload.contact_phone = patch.contact_phone?.trim() || null
  if (patch.contact_email !== undefined)
    payload.contact_email = patch.contact_email?.trim() || null
  if (patch.specialties != null) payload.specialties = patch.specialties.trim()
  if (patch.active != null) payload.active = patch.active
  if (patch.webhook_url !== undefined)
    payload.webhook_url = patch.webhook_url?.trim() || null
  if (patch.preferred != null) payload.preferred = patch.preferred
  if (patch.coverage_regions !== undefined) {
    payload.coverage_regions = patch.coverage_regions.map((c) => c.toUpperCase())
  }
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null

  const { data, error } = await supabase
    .from('vendors')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return toPublic(memUpdateVendor(id, patch))
    }
    throw new Error(error.message)
  }
  return toPublic(rowToMem(data))
}

export async function getVendorSecret(id: string): Promise<MemVendor | undefined> {
  if (!(await supabaseReady())) {
    return memGetVendor(id)
  }

  const supabase = createSystemClient('vendors_secret')
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    if (error && isSupabaseSchemaError(error)) {
      return memGetVendor(id)
    }
    return undefined
  }
  return rowToMem(data)
}
