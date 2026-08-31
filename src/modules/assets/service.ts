import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import {
  memCreateAsset,
  memDeleteAsset,
  memListAssets,
  memUpdateAsset,
  supabaseReady,
  type MemAsset,
} from '@/lib/data/memory-store'
import { fetchStores } from '@/modules/stores/data'
import { normalizeBarcode } from '@/modules/assets/barcode'

const ASSET_SELECT =
  'id, store_id, code, name, asset_type, barcode, created_at'
const ASSET_SELECT_LEGACY = 'id, store_id, code, name, asset_type, created_at'

export type AssetRow = MemAsset & {
  store_code?: string
  store_name?: string
}

function normalizeOptionalBarcode(value?: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return normalizeBarcode(trimmed)
}

export async function listAssets(opts?: {
  storeId?: string
}): Promise<{ assets: AssetRow[]; backend: 'supabase' | 'memory' }> {
  const { stores } = await fetchStores({ includeInactive: true })
  const storeMap = new Map(stores.map((s) => [s.id, s]))

  if (await supabaseReady()) {
    const supabase = createSystemClient('assets_list')
    let q = supabase.from('assets').select(ASSET_SELECT).order('code')
    if (opts?.storeId) q = q.eq('store_id', opts.storeId)
    let { data, error } = await q

    if (error && isSupabaseSchemaError(error)) {
      let legacy = supabase.from('assets').select(ASSET_SELECT_LEGACY).order('code')
      if (opts?.storeId) legacy = legacy.eq('store_id', opts.storeId)
      const retry = await legacy
      data = (retry.data ?? []).map((a) => ({ ...a, barcode: null }))
      error = retry.error
    }

    if (!error && data) {
      return {
        backend: 'supabase',
        assets: data.map((a) => ({
          ...(a as MemAsset),
          barcode: (a as MemAsset).barcode ?? null,
          status: (a as MemAsset).status ?? 'ok',
          store_code: storeMap.get(a.store_id)?.code,
          store_name: storeMap.get(a.store_id)?.name,
        })),
      }
    }
  }

  return {
    backend: 'memory',
    assets: memListAssets(opts?.storeId).map((a) => ({
      ...a,
      store_code: storeMap.get(a.store_id)?.code,
      store_name: storeMap.get(a.store_id)?.name,
    })),
  }
}

export async function createAsset(input: {
  store_id: string
  code: string
  name: string
  asset_type?: string
  barcode?: string | null
}): Promise<AssetRow> {
  const barcode = normalizeOptionalBarcode(input.barcode)
  if (await supabaseReady()) {
    const supabase = createSystemClient('assets_create')
    const payload = {
      store_id: input.store_id,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      asset_type: input.asset_type?.trim() || 'other',
      barcode,
    }
    let { data, error } = await supabase
      .from('assets')
      .insert(payload)
      .select(ASSET_SELECT)
      .single()

    if (error && isSupabaseSchemaError(error)) {
      const legacyPayload = {
        store_id: payload.store_id,
        code: payload.code,
        name: payload.name,
        asset_type: payload.asset_type,
      }
      const retry = await supabase
        .from('assets')
        .insert(legacyPayload)
        .select(ASSET_SELECT_LEGACY)
        .single()
      data = retry.data
        ? { ...retry.data, barcode: null }
        : null
      error = retry.error
    }

    if (error || !data) throw new Error(error?.message || 'יצירת נכס נכשלה')
    return data as MemAsset
  }
  return memCreateAsset({ ...input, barcode })
}

export async function updateAsset(
  id: string,
  patch: {
    name?: string
    code?: string
    asset_type?: string
    barcode?: string | null
    status?: MemAsset['status']
  },
): Promise<AssetRow> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('assets_update')
    const body: Record<string, string | null> = {}
    if (patch.name != null) body.name = patch.name.trim()
    if (patch.code != null) body.code = patch.code.trim().toUpperCase()
    if (patch.asset_type != null) body.asset_type = patch.asset_type.trim() || 'other'
    if (patch.barcode !== undefined) {
      body.barcode = normalizeOptionalBarcode(patch.barcode)
    }

    let { data, error } = await supabase
      .from('assets')
      .update(body)
      .eq('id', id)
      .select(ASSET_SELECT)
      .single()

    if (error && isSupabaseSchemaError(error)) {
      const legacyBody = { ...body }
      delete legacyBody.barcode
      const retry = await supabase
        .from('assets')
        .update(legacyBody)
        .eq('id', id)
        .select(ASSET_SELECT_LEGACY)
        .single()
      data = retry.data ? { ...retry.data, barcode: null } : null
      error = retry.error
    }

    if (error || !data) throw new Error(error?.message || 'עדכון נכס נכשל')
    return { ...(data as MemAsset), status: patch.status ?? 'ok' }
  }
  return memUpdateAsset(id, {
    ...patch,
    barcode:
      patch.barcode === undefined
        ? undefined
        : normalizeOptionalBarcode(patch.barcode),
  })
}

export async function deleteAsset(id: string): Promise<void> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('assets_delete')
    const { error } = await supabase.from('assets').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  memDeleteAsset(id)
}

export function assetWhatsAppPrefill(storeCode: string, assetCode: string) {
  return `STORE_${storeCode} ASSET_${assetCode}`
}
