import { createSystemClient } from '@/lib/supabase/system'
import {
  MEM_COUNTRY_ID,
  MEM_ORG_ID,
  memCreateStore,
  memFindStoreById,
  memListStores,
  memUpdateStore,
  supabaseReady,
  type MemStore,
} from '@/lib/data/memory-store'
import { AuthError, type Actor } from '@/lib/auth/types'
import type { StoreRow } from '@/modules/stores/data'

export type StoreRecord = StoreRow & {
  organization_id?: string
  country_id?: string
  is_active: boolean
}

export function requireStoresMutate(actor: Actor) {
  const ok = actor.memberships.some(
    (m) => m.role === 'global_admin' || m.role === 'country_manager',
  )
  if (!ok) {
    throw new AuthError('אין הרשאת ניהול חנויות', 403)
  }
}

function toRecord(s: MemStore): StoreRecord {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    city: s.city,
    address: s.address,
    region_id: s.region_id,
    organization_id: s.organization_id,
    country_id: s.country_id,
    is_active: s.is_active,
  }
}

export async function listStores(opts?: {
  includeInactive?: boolean
}): Promise<{ stores: StoreRecord[]; backend: 'supabase' | 'memory' }> {
  if (!(await supabaseReady())) {
    return {
      stores: memListStores({ activeOnly: !opts?.includeInactive }).map(toRecord),
      backend: 'memory',
    }
  }

  const supabase = createSystemClient('stores_list')
  let query = supabase
    .from('stores')
    .select('id, code, name, city, address, region_id, organization_id, country_id, is_active')
    .order('code')
  if (!opts?.includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return {
    stores: (data ?? []) as StoreRecord[],
    backend: 'supabase',
  }
}

export async function getStoreByCode(
  code: string,
): Promise<{ store: StoreRecord | null; backend: 'supabase' | 'memory' }> {
  if (!(await supabaseReady())) {
    const store = memListStores({ activeOnly: false }).find((s) => s.code === code)
    return { store: store ? toRecord(store) : null, backend: 'memory' }
  }

  const supabase = createSystemClient('stores_get')
  const { data, error } = await supabase
    .from('stores')
    .select('id, code, name, city, address, region_id, organization_id, country_id, is_active')
    .eq('code', code)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return { store: (data as StoreRecord | null) ?? null, backend: 'supabase' }
}

export type CreateStoreInput = {
  code: string
  name: string
  city?: string | null
  address?: string | null
  region_id?: string
  country_id?: string
  organization_id?: string
}

export async function createStore(input: CreateStoreInput): Promise<StoreRecord> {
  const code = input.code.trim()
  const name = input.name.trim()
  if (!/^\d{1,6}$/.test(code)) {
    throw new Error('קוד חנות חייב להיות מספרי (עד 6 ספרות)')
  }
  if (!name) throw new Error('שם חנות חובה')

  if (!(await supabaseReady())) {
    return toRecord(
      memCreateStore({
        code,
        name,
        city: input.city,
        address: input.address,
        region_id: input.region_id ?? 'ta',
        country_id: input.country_id ?? MEM_COUNTRY_ID,
        organization_id: input.organization_id ?? MEM_ORG_ID,
      }),
    )
  }

  const supabase = createSystemClient('stores_create')
  const organizationId = input.organization_id ?? MEM_ORG_ID
  const countryId = input.country_id ?? MEM_COUNTRY_ID
  // Seed IL Tel Aviv region — used when UI omits region (memory uses short codes).
  const regionId =
    input.region_id && input.region_id.length > 8
      ? input.region_id
      : '33333333-3333-3333-3333-333333333301'

  const { data, error } = await supabase
    .from('stores')
    .insert({
      code,
      name,
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      region_id: regionId,
      country_id: countryId,
      organization_id: organizationId,
      is_active: true,
    })
    .select('id, code, name, city, address, region_id, organization_id, country_id, is_active')
    .single()
  if (error) throw new Error(error.message)
  return data as StoreRecord
}

export type UpdateStoreInput = {
  name?: string
  city?: string | null
  address?: string | null
  region_id?: string
  is_active?: boolean
}

export async function updateStore(
  id: string,
  patch: UpdateStoreInput,
): Promise<StoreRecord> {
  if (!(await supabaseReady())) {
    const existing = memFindStoreById(id)
    if (!existing) throw new Error('חנות לא נמצאה')
    return toRecord(memUpdateStore(id, patch))
  }

  const supabase = createSystemClient('stores_update')
  const payload: Record<string, unknown> = {}
  if (patch.name !== undefined) payload.name = patch.name.trim()
  if (patch.city !== undefined) payload.city = patch.city?.trim() || null
  if (patch.address !== undefined) payload.address = patch.address?.trim() || null
  if (patch.region_id !== undefined) payload.region_id = patch.region_id
  if (patch.is_active !== undefined) payload.is_active = patch.is_active

  const { data, error } = await supabase
    .from('stores')
    .update(payload)
    .eq('id', id)
    .select('id, code, name, city, address, region_id, organization_id, country_id, is_active')
    .single()
  if (error) throw new Error(error.message)
  return data as StoreRecord
}
