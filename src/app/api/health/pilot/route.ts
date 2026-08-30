import { NextResponse } from 'next/server'
import { createSystemClient } from '@/lib/supabase/system'
import { supabaseReady } from '@/lib/data/memory-store'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { isWhatsAppAiIntakeEnabled, resolveIntakeLlmProvider } from '@/modules/whatsapp/agent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Check = {
  id: string
  ok: boolean
  level: 'must' | 'should' | 'info'
  message: string
  owner: 'build' | 'meta' | 'ops'
}

function envSet(...names: string[]) {
  return names.some((n) => Boolean(process.env[n]?.trim()))
}

/**
 * Pilot readiness — no secret values leaked, only booleans + guidance.
 * GET /api/health/pilot
 */
export async function GET() {
  const checks: Check[] = []
  const ready = await supabaseReady()

  checks.push({
    id: 'backend_supabase',
    ok: ready,
    level: 'must',
    message: ready
      ? 'Supabase מחובר'
      : 'Backend ב־memory — הגדירו SUPABASE_* בפרודקשן',
    owner: 'build',
  })

  const waToken = envSet('WHATSAPP_ACCESS_TOKEN')
  const waPhoneId = envSet('WHATSAPP_PHONE_NUMBER_ID', 'NEXT_PUBLIC_WA_PHONE_NUMBER_ID')
  const waVerify = envSet('WHATSAPP_VERIFY_TOKEN', 'WA_VERIFY_TOKEN')
  const waSecret = envSet('WHATSAPP_APP_SECRET', 'WA_APP_SECRET')

  checks.push({
    id: 'meta_token',
    ok: waToken,
    level: 'must',
    message: waToken
      ? 'WHATSAPP_ACCESS_TOKEN מוגדר'
      : 'חסר WHATSAPP_ACCESS_TOKEN (Meta)',
    owner: 'meta',
  })
  checks.push({
    id: 'meta_phone_number_id',
    ok: waPhoneId,
    level: 'must',
    message: waPhoneId
      ? 'WHATSAPP_PHONE_NUMBER_ID מוגדר'
      : 'חסר WHATSAPP_PHONE_NUMBER_ID (Meta)',
    owner: 'meta',
  })
  checks.push({
    id: 'meta_verify_token',
    ok: waVerify,
    level: 'must',
    message: waVerify
      ? 'WHATSAPP_VERIFY_TOKEN מוגדר'
      : 'חסר WHATSAPP_VERIFY_TOKEN לאימות webhook',
    owner: 'meta',
  })
  checks.push({
    id: 'meta_app_secret',
    ok: waSecret,
    level: 'must',
    message: waSecret
      ? 'WHATSAPP_APP_SECRET מוגדר'
      : 'חסר WHATSAPP_APP_SECRET לחתימות',
    owner: 'meta',
  })

  const businessPhone = (await resolveWhatsAppBusinessPhone()) || ''
  checks.push({
    id: 'wa_business_phone',
    ok: businessPhone.length >= 8,
    level: 'must',
    message: businessPhone.length >= 8
      ? `מספר עסקי ל־QR מוגדר (${businessPhone.slice(0, 4)}…)`
      : 'חסר מספר עסקי — NEXT_PUBLIC_WA_BUSINESS_PHONE או הגדרות Ops → WhatsApp',
    owner: 'meta',
  })

  const aiProvider = resolveIntakeLlmProvider()
  const aiOn = isWhatsAppAiIntakeEnabled()
  checks.push({
    id: 'ai_intake',
    ok: aiOn,
    level: 'should',
    message: aiOn
      ? `AI Intake פעיל (${aiProvider})`
      : 'AI Intake כבוי — יעבוד rules-only; הפעילו AI Gateway ב־Vercel',
    owner: 'ops',
  })

  let schemaAi = false
  let schemaMessages = false
  let countryDemo = true
  let storePhones = 0
  if (ready) {
    try {
      const supabase = createSystemClient('pilot_health')
      const { error: colErr } = await supabase
        .from('tickets')
        .select('ai_summary')
        .limit(1)
      schemaAi = !colErr

      const { error: msgErr } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .limit(1)
      schemaMessages = !msgErr

      const { data: countries } = await supabase
        .from('countries')
        .select('code, whatsapp_phone_number_id')
        .eq('code', 'IL')
        .maybeSingle()
      const id = countries?.whatsapp_phone_number_id || ''
      countryDemo = !id || id.includes('demo') || id.startsWith('wa_phone_')

      const { count } = await supabase
        .from('store_phones')
        .select('*', { count: 'exact', head: true })
      storePhones = count ?? 0
    } catch {
      /* ignore */
    }
  }

  checks.push({
    id: 'schema_ai_intake',
    ok: schemaAi && schemaMessages,
    level: 'must',
    message:
      schemaAi && schemaMessages
        ? 'מיגרציית AI Intake מיושמת (ai_summary + whatsapp_messages)'
        : 'חסרה מיגרציה 20260827230000_whatsapp_ai_intake — הריצו SQL ב־Supabase',
    owner: 'build',
  })

  checks.push({
    id: 'country_phone_number_id',
    ok: !countryDemo && ready,
    level: 'must',
    message: !ready
      ? 'לא ניתן לבדוק countries בלי Supabase'
      : countryDemo
        ? 'countries.whatsapp_phone_number_id עדיין demo — עדכנו למזהה Meta האמיתי'
        : 'מזהה מדינה IL מחובר ל־Meta',
    owner: 'meta',
  })

  checks.push({
    id: 'store_phones',
    ok: storePhones > 0,
    level: 'should',
    message:
      storePhones > 0
        ? `${storePhones} מספרי עובדים ממופים לחנויות`
        : 'אין store_phones — עובדים יצטרכו לשלוח STORE_xxx בכל דיווח',
    owner: 'ops',
  })

  checks.push({
    id: 'force_memory_off',
    ok: process.env.MAINTAINOS_FORCE_MEMORY !== '1',
    level: 'must',
    message:
      process.env.MAINTAINOS_FORCE_MEMORY === '1'
        ? 'MAINTAINOS_FORCE_MEMORY=1 — כבו בפרודקשן'
        : 'FORCE_MEMORY כבוי',
    owner: 'ops',
  })

  // Live Graph probe — token must be able to read the configured phone number.
  let graphOk = false
  let graphMessage = 'לא נבדק — חסר טוקן או מזהה מספר'
  if (waToken && waPhoneId) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim()
    const phoneId = (
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
      ''
    ).trim()
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}?fields=id,display_phone_number,verified_name`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        },
      )
      const json = (await res.json()) as {
        id?: string
        display_phone_number?: string
        error?: { message?: string; code?: number }
      }
      if (res.ok && json.id) {
        graphOk = true
        const display = json.display_phone_number
          ? ` (${json.display_phone_number})`
          : ''
        graphMessage = `Meta Graph מאשר את מספר הבוט${display}`
      } else {
        graphMessage =
          json.error?.message ||
          `Meta Graph דחה את הטוקן (HTTP ${res.status}) — צרו System User Token על ה־WABA הנכון`
      }
    } catch (e) {
      graphMessage =
        e instanceof Error ? e.message : 'בדיקת Graph נכשלה'
    }
  }
  checks.push({
    id: 'meta_graph_send_ready',
    ok: graphOk,
    level: 'must',
    message: graphMessage,
    owner: 'meta',
  })

  const must = checks.filter((c) => c.level === 'must')
  const mustOk = must.every((c) => c.ok)
  const buildMustOk = must.filter((c) => c.owner === 'build').every((c) => c.ok)
  const metaMustOk = must.filter((c) => c.owner === 'meta').every((c) => c.ok)

  return NextResponse.json({
    ok: mustOk,
    readyForPilot: mustOk,
    buildSideReady: buildMustOk,
    metaSideReady: metaMustOk,
    webhookUrl: 'https://optical-center-rose.vercel.app/api/whatsapp/webhook',
    backend: ready ? 'supabase' : 'memory',
    checks,
    nextSteps: must.filter((c) => !c.ok).map((c) => ({
      id: c.id,
      owner: c.owner,
      message: c.message,
    })),
  })
}
