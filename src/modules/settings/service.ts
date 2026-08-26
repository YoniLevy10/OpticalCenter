import { createSystemClient } from '@/lib/supabase/system'
import {
  memGetSettings,
  memUpdateSettings,
  MEM_ORG_ID,
  supabaseReady,
  type MemSettings,
} from '@/lib/data/memory-store'

export type AppSettings = MemSettings

export async function getSettings(): Promise<{
  settings: AppSettings
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady())) {
    return { settings: memGetSettings(), backend: 'memory' }
  }

  const supabase = createSystemClient('settings_get')
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('organization_id', MEM_ORG_ID)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    return { settings: memGetSettings(), backend: 'supabase' }
  }

  return {
    backend: 'supabase',
    settings: {
      brand_name: data.brand_name,
      country_label: data.country_label,
      wa_business_phone: data.wa_business_phone,
      sla_respond_hours_critical: data.sla_respond_hours_critical,
      sla_respond_hours_high: data.sla_respond_hours_high,
      sla_respond_hours_medium: data.sla_respond_hours_medium,
      sla_respond_hours_low: data.sla_respond_hours_low,
      notify_email: data.notify_email,
    },
  }
}

export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  if (!(await supabaseReady())) {
    return memUpdateSettings(patch)
  }

  const supabase = createSystemClient('settings_patch')
  const current = await getSettings()
  const next = { ...current.settings, ...patch }

  const { error } = await supabase.from('app_settings').upsert({
    organization_id: MEM_ORG_ID,
    brand_name: next.brand_name,
    country_label: next.country_label,
    wa_business_phone: next.wa_business_phone,
    sla_respond_hours_critical: next.sla_respond_hours_critical,
    sla_respond_hours_high: next.sla_respond_hours_high,
    sla_respond_hours_medium: next.sla_respond_hours_medium,
    sla_respond_hours_low: next.sla_respond_hours_low,
    notify_email: next.notify_email,
  })

  if (error) throw new Error(error.message)
  return next
}
