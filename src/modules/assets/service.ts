import { createSystemClient } from '@/lib/supabase/system'
import {
  memCreateAsset,
  memDeleteAsset,
  memListAssets,
  memUpdateAsset,
  supabaseReady,
  type MemAsset,
} from '@/lib/data/memory-store'
import { fetchStores } from '@/modules/stores/data'

export type AssetRow = MemAsset & {
  store_code?: string
  store_name?: string
}

export async function listAssets(opts?: {
  storeId?: string
}): Promise<{ assets: AssetRow[]; backend: 'supabase' | 'memory' }> {
  const { stores } = await fetchStores({ includeInactive: true })
  const storeMap = new Map(stores.map((s) => [s.id, s]))

  if (await supabaseReady()) {
    const supabase = createSystemClient('assets_list')
    let q = supabase
      .from('assets')
      .select('id, store_id, code, name, asset_type, created_at')
      .order('code')
    if (opts?.storeId) q = q.eq('store_id', opts.storeId)
    const { data, error } = await q
    if (!error && data) {
      return {
        backend: 'supabase',
        assets: data.map((a) => ({
          ...(a as MemAsset),
          // DB has no status column — UI derives / defaults to ok.
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
}): Promise<AssetRow> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('assets_create')
    const { data, error } = await supabase
      .from('assets')
      .insert({
        store_id: input.store_id,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        asset_type: input.asset_type?.trim() || 'other',
      })
      .select('id, store_id, code, name, asset_type, created_at')
      .single()
    if (error || !data) throw new Error(error?.message || 'יצירת נכס נכשלה')
    return data as MemAsset
  }
  return memCreateAsset(input)
}

export async function updateAsset(
  id: string,
  patch: {
    name?: string
    code?: string
    asset_type?: string
    status?: MemAsset['status']
  },
): Promise<AssetRow> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('assets_update')
    const body: Record<string, string> = {}
    if (patch.name != null) body.name = patch.name.trim()
    if (patch.code != null) body.code = patch.code.trim().toUpperCase()
    if (patch.asset_type != null) body.asset_type = patch.asset_type.trim() || 'other'
    // status is memory-only until a DB column exists
    const { data, error } = await supabase
      .from('assets')
      .update(body)
      .eq('id', id)
      .select('id, store_id, code, name, asset_type, created_at')
      .single()
    if (error || !data) throw new Error(error?.message || 'עדכון נכס נכשל')
    return { ...(data as MemAsset), status: patch.status ?? 'ok' }
  }
  return memUpdateAsset(id, patch)
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
