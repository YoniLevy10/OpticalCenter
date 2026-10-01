/**
 * Admin CRUD for whatsapp_templates catalog (Ops settings).
 */

import { createSystemClient } from '@/lib/supabase/system'
import { isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'
import { MEM_ORG_ID, MEM_COUNTRY_ID, supabaseReady } from '@/lib/data/memory-store'
import { META_WA_TEMPLATES } from './templates'

export type WhatsAppTemplateRow = {
  id: string
  key: string
  language: string
  meta_name: string | null
  body: string
  category: string
  is_active: boolean
}

const memTemplates = new Map<string, WhatsAppTemplateRow>()

function seedMemTemplates() {
  if (memTemplates.size > 0) return
  const seeds: WhatsAppTemplateRow[] = [
    {
      id: 'mem-tpl-followup',
      key: 'session_followup',
      language: 'he',
      meta_name: META_WA_TEMPLATES.followup.metaName,
      body: META_WA_TEMPLATES.followup.body,
      category: 'utility',
      is_active: true,
    },
    {
      id: 'mem-tpl-received',
      key: 'ticket_received',
      language: 'he',
      meta_name: null,
      body: 'הדיווח התקבל ✓ מספר תקלה: {{ticket_number}}. הצוות קיבל את הדיווח.',
      category: 'utility',
      is_active: true,
    },
    {
      id: 'mem-tpl-resolved',
      key: 'ticket_resolved',
      language: 'he',
      meta_name: null,
      body: 'התקלה {{ticket_number}} נסגרה. תודה על הדיווח.',
      category: 'utility',
      is_active: true,
    },
    {
      id: 'mem-tpl-ticket-update',
      key: 'ticket_update',
      language: 'he',
      meta_name: META_WA_TEMPLATES.ticketUpdate.metaName,
      body: META_WA_TEMPLATES.ticketUpdate.body,
      category: 'utility',
      is_active: false,
    },
  ]
  for (const s of seeds) memTemplates.set(s.id, s)
}

export async function listWhatsAppTemplates(): Promise<{
  templates: WhatsAppTemplateRow[]
  backend: 'memory' | 'supabase'
}> {
  seedMemTemplates()
  if (!(await supabaseReady()) || process.env.MAINTAINOS_FORCE_MEMORY === '1') {
    return {
      templates: [...memTemplates.values()].sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
      backend: 'memory',
    }
  }

  const supabase = createSystemClient('wa_templates_list')
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('id, key, language, meta_name, body, category, is_active')
    .eq('organization_id', MEM_ORG_ID)
    .order('key')

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return {
        templates: [...memTemplates.values()],
        backend: 'memory',
      }
    }
    throw new Error(error.message)
  }
  return {
    templates: (data ?? []) as WhatsAppTemplateRow[],
    backend: 'supabase',
  }
}

export async function updateWhatsAppTemplate(input: {
  id: string
  meta_name?: string | null
  body?: string
  category?: string
  is_active?: boolean
}): Promise<WhatsAppTemplateRow> {
  seedMemTemplates()
  if (!(await supabaseReady()) || process.env.MAINTAINOS_FORCE_MEMORY === '1') {
    const row = memTemplates.get(input.id)
    if (!row) throw new Error('תבנית לא נמצאה')
    const next = {
      ...row,
      meta_name:
        input.meta_name !== undefined ? input.meta_name : row.meta_name,
      body: input.body !== undefined ? input.body : row.body,
      category: input.category !== undefined ? input.category : row.category,
      is_active:
        input.is_active !== undefined ? input.is_active : row.is_active,
    }
    memTemplates.set(input.id, next)
    return next
  }

  const supabase = createSystemClient('wa_templates_patch')
  const patch: Record<string, unknown> = {}
  if (input.meta_name !== undefined) patch.meta_name = input.meta_name
  if (input.body !== undefined) patch.body = input.body
  if (input.category !== undefined) patch.category = input.category
  if (input.is_active !== undefined) patch.is_active = input.is_active

  const { data, error } = await supabase
    .from('whatsapp_templates')
    .update(patch)
    .eq('id', input.id)
    .eq('organization_id', MEM_ORG_ID)
    .select('id, key, language, meta_name, body, category, is_active')
    .single()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      const row = memTemplates.get(input.id)
      if (!row) throw new Error('תבנית לא נמצאה')
      const next = {
        ...row,
        meta_name:
          input.meta_name !== undefined ? input.meta_name : row.meta_name,
        body: input.body !== undefined ? input.body : row.body,
        category: input.category !== undefined ? input.category : row.category,
        is_active:
          input.is_active !== undefined ? input.is_active : row.is_active,
      }
      memTemplates.set(input.id, next)
      return next
    }
    throw new Error(error.message)
  }
  return data as WhatsAppTemplateRow
}

export type CountryWhatsAppCredentials = {
  country_id: string
  code: string
  whatsapp_phone_number_id: string | null
  whatsapp_display_phone: string | null
  /** Masked — never return raw token to browser. */
  has_access_token: boolean
}

export async function getCountryWhatsAppCredentials(): Promise<{
  credentials: CountryWhatsAppCredentials
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady()) || process.env.MAINTAINOS_FORCE_MEMORY === '1') {
    return {
      backend: 'memory',
      credentials: {
        country_id: MEM_COUNTRY_ID,
        code: 'IL',
        whatsapp_phone_number_id:
          process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
        whatsapp_display_phone:
          process.env.NEXT_PUBLIC_WA_BUSINESS_PHONE?.replace(/\D/g, '') ||
          '972552819086',
        has_access_token: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
      },
    }
  }

  const supabase = createSystemClient('country_wa_get')
  const { data, error } = await supabase
    .from('countries')
    .select(
      'id, code, whatsapp_phone_number_id, whatsapp_display_phone, whatsapp_access_token',
    )
    .eq('id', MEM_COUNTRY_ID)
    .maybeSingle()

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return {
        backend: 'memory',
        credentials: {
          country_id: MEM_COUNTRY_ID,
          code: 'IL',
          whatsapp_phone_number_id:
            process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
          whatsapp_display_phone:
            process.env.NEXT_PUBLIC_WA_BUSINESS_PHONE?.replace(/\D/g, '') ||
            null,
          has_access_token: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
        },
      }
    }
    throw new Error(error.message)
  }

  return {
    backend: 'supabase',
    credentials: {
      country_id: data?.id ?? MEM_COUNTRY_ID,
      code: data?.code ?? 'IL',
      whatsapp_phone_number_id: data?.whatsapp_phone_number_id ?? null,
      whatsapp_display_phone: data?.whatsapp_display_phone ?? null,
      has_access_token: Boolean(data?.whatsapp_access_token?.trim()),
    },
  }
}

export async function updateCountryWhatsAppCredentials(input: {
  whatsapp_phone_number_id?: string | null
  whatsapp_display_phone?: string | null
  /** Set only when provided; empty string clears. */
  whatsapp_access_token?: string | null
}): Promise<CountryWhatsAppCredentials> {
  if (!(await supabaseReady()) || process.env.MAINTAINOS_FORCE_MEMORY === '1') {
    // Memory/dev: credentials live in env — return current view.
    return (await getCountryWhatsAppCredentials()).credentials
  }

  const supabase = createSystemClient('country_wa_patch')
  const patch: Record<string, unknown> = {}
  if (input.whatsapp_phone_number_id !== undefined) {
    patch.whatsapp_phone_number_id = input.whatsapp_phone_number_id
  }
  if (input.whatsapp_display_phone !== undefined) {
    patch.whatsapp_display_phone = input.whatsapp_display_phone
  }
  if (input.whatsapp_access_token !== undefined) {
    const t = input.whatsapp_access_token?.trim()
    patch.whatsapp_access_token = t || null
  }

  const { error } = await supabase
    .from('countries')
    .update(patch)
    .eq('id', MEM_COUNTRY_ID)

  if (error) throw new Error(error.message)
  return (await getCountryWhatsAppCredentials()).credentials
}
