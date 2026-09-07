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
  let countryPhoneId = ''
  let storePhones = 0
  let recentInboundCount = 0
  let recentOutboundOkCount = 0
  let recentOutboundFailCount = 0
  let activeHumanPauses = 0
  let lastInboundSummary = ''
  let lastSendFailSummary = ''
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
      countryPhoneId = countries?.whatsapp_phone_number_id || ''
      countryDemo =
        !countryPhoneId ||
        countryPhoneId.includes('demo') ||
        countryPhoneId.startsWith('wa_phone_')

      const { count } = await supabase
        .from('store_phones')
        .select('*', { count: 'exact', head: true })
      storePhones = count ?? 0

      const sinceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { count: inboundCount } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .gte('created_at', sinceIso)
      recentInboundCount = inboundCount ?? 0

      const { data: recentOut } = await supabase
        .from('whatsapp_messages')
        .select('meta_message_id, body, created_at')
        .eq('direction', 'outbound')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(50)
      for (const row of recentOut ?? []) {
        const mid = (row.meta_message_id as string | null) ?? ''
        if (mid.startsWith('graph_fail:')) {
          recentOutboundFailCount += 1
          if (!lastSendFailSummary) {
            lastSendFailSummary = String(row.body ?? '').slice(0, 180)
          }
        } else if (mid && !mid.startsWith('dryrun_')) {
          recentOutboundOkCount += 1
        } else if (!mid) {
          // Legacy failed sends before graph_fail marker
          recentOutboundFailCount += 1
          if (!lastSendFailSummary && String(row.body ?? '').startsWith('[שליחה נכשלה]')) {
            lastSendFailSummary = String(row.body ?? '').slice(0, 180)
          }
        }
      }

      const { data: lastIn } = await supabase
        .from('whatsapp_messages')
        .select('wa_id, body, created_at')
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastIn?.wa_id) {
        const wa = String(lastIn.wa_id)
        const masked =
          wa.length > 6 ? `${wa.slice(0, 4)}…${wa.slice(-3)}` : wa
        const body = (lastIn.body as string | null)?.slice(0, 40) || '(ללא טקסט)'
        lastInboundSummary = `${masked}: ${body}`
      }

      const nowIso = new Date().toISOString()
      const { count: pauseCount } = await supabase
        .from('intake_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('human_takeover', true)
        .gt('human_takeover_until', nowIso)
      activeHumanPauses = pauseCount ?? 0
    } catch {
      /* ignore */
    }
  }

  const envPhoneId = (
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
    ''
  ).trim()
  let phoneIdAligned =
    !envPhoneId || !countryPhoneId || countryDemo
      ? true
      : envPhoneId === countryPhoneId

  // Auto-heal stale / demo countries.whatsapp_phone_number_id after Meta reconnect.
  if (ready && envPhoneId && countryPhoneId !== envPhoneId) {
    try {
      const supabase = createSystemClient('pilot_health_heal_phone')
      const { error: healErr } = await supabase
        .from('countries')
        .update({ whatsapp_phone_number_id: envPhoneId })
        .eq('code', 'IL')
      if (!healErr) {
        countryPhoneId = envPhoneId
        countryDemo = false
        phoneIdAligned = true
        checks.push({
          id: 'country_phone_auto_healed',
          ok: true,
          level: 'info',
          message: `עודכן countries.whatsapp_phone_number_id ל־env (${envPhoneId.slice(0, 6)}…)`,
          owner: 'meta',
        })
      }
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
    id: 'country_phone_matches_env',
    ok: phoneIdAligned,
    level: 'must',
    message: phoneIdAligned
      ? 'מזהה המספר ב־DB תואם ל־Vercel env'
      : `אי־התאמה אחרי חיבור Meta מחדש — DB≠env. הריצו: configure-whatsapp-country --phone-number-id=${envPhoneId || '<ID>'}`,
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
  let tokenValid: boolean | null = null
  let tokenProbeMessage = 'לא נבדק'
  if (waToken && waPhoneId) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim()
    const phoneId = (
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.NEXT_PUBLIC_WA_PHONE_NUMBER_ID ||
      ''
    ).trim()
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        },
      )
      const json = (await res.json()) as {
        id?: string
        display_phone_number?: string
        quality_rating?: string
        messaging_limit_tier?: string
        status?: string
        error?: { message?: string; code?: number }
      }
      if (res.ok && json.id) {
        graphOk = true
        const display = json.display_phone_number
          ? ` (${json.display_phone_number})`
          : ''
        const extras = [
          json.status ? `status=${json.status}` : null,
          json.quality_rating ? `quality=${json.quality_rating}` : null,
          json.messaging_limit_tier ? `tier=${json.messaging_limit_tier}` : null,
        ]
          .filter(Boolean)
          .join(', ')
        graphMessage = `Meta Graph מאשר את מספר הבוט${display}${extras ? ` · ${extras}` : ''}`
      } else {
        graphMessage =
          json.error?.message ||
          `Meta Graph דחה את הטוקן (HTTP ${res.status}) — צרו System User Token על ה־WABA הנכון`
      }
    } catch (e) {
      graphMessage =
        e instanceof Error ? e.message : 'בדיקת Graph נכשלה'
    }

    try {
      const dbg = await fetch(
        `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
        { cache: 'no-store' },
      )
      const dbgJson = (await dbg.json()) as {
        data?: {
          is_valid?: boolean
          scopes?: string[]
          type?: string
          app_id?: string
          expires_at?: number
          error?: { message?: string }
        }
        error?: { message?: string }
      }
      const data = dbgJson.data
      if (data) {
        tokenValid = Boolean(data.is_valid)
        const scopes = data.scopes ?? []
        const hasWa =
          scopes.some((s) => /whatsapp/i.test(s)) || scopes.length === 0
        tokenProbeMessage = tokenValid
          ? `טוקן תקף (${data.type || 'token'})${scopes.length ? ` · scopes: ${scopes.slice(0, 6).join(', ')}` : ''}${hasWa ? '' : ' · חסר scope של WhatsApp'}`
          : `טוקן לא תקף — ${data.error?.message || dbgJson.error?.message || 'חדשו System User Token'}`
      } else {
        tokenProbeMessage =
          dbgJson.error?.message || `debug_token נכשל (HTTP ${dbg.status})`
      }
    } catch (e) {
      tokenProbeMessage =
        e instanceof Error ? e.message : 'בדיקת debug_token נכשלה'
    }
  }
  checks.push({
    id: 'meta_graph_send_ready',
    ok: graphOk,
    level: 'must',
    message: graphMessage,
    owner: 'meta',
  })

  checks.push({
    id: 'meta_token_debug',
    ok: tokenValid !== false,
    level: 'should',
    message: tokenProbeMessage,
    owner: 'meta',
  })

  checks.push({
    id: 'recent_inbound_webhook',
    ok: true,
    level: 'info',
    message: ready
      ? recentInboundCount > 0
        ? `${recentInboundCount} נכנסות / ${recentOutboundOkCount} נשלחו / ${recentOutboundFailCount} נכשלו ב־30 דק׳${lastInboundSummary ? ` · אחרונה: ${lastInboundSummary}` : ''}`
        : 'אין הודעות נכנסות ב־30 הדקות האחרונות — אם שלחתם לבוט ולא הופיע כאן, בדקו ב־Meta שה־webhook מצביע ל־Callback URL וה־messages subscribed'
      : 'לא ניתן לבדוק inbound בלי Supabase',
    owner: 'meta',
  })

  checks.push({
    id: 'graph_send_failures',
    ok: recentOutboundFailCount === 0 || recentOutboundOkCount > 0,
    level: 'must',
    message:
      recentOutboundFailCount > 0 && recentOutboundOkCount === 0
        ? `שליחת WhatsApp נכשלת ב־Meta${lastSendFailSummary ? ` — ${lastSendFailSummary}` : ''}. בדקו Tester list / Advanced Access / System User Token.`
        : recentOutboundFailCount > 0
          ? `יש ${recentOutboundFailCount} כשלי שליחה וגם ${recentOutboundOkCount} הצלחות לאחרונה`
          : recentOutboundOkCount > 0
            ? 'שליחות ל־WhatsApp מצליחות'
            : 'אין שליחות יוצאות לבדיקה',
    owner: 'meta',
  })

  checks.push({
    id: 'inbound_without_reply',
    ok: !(recentInboundCount > 0 && recentOutboundOkCount === 0),
    level: 'should',
    message:
      recentInboundCount > 0 && recentOutboundOkCount === 0
        ? 'יש הודעות נכנסות בלי תשובות שנשלחו בהצלחה — Meta דוחה את ה־Graph send'
        : recentOutboundOkCount > 0
          ? 'יש תשובות יוצאות מהבוט לאחרונה'
          : 'אין פעילות יוצאת לבדיקה',
    owner: 'ops',
  })

  checks.push({
    id: 'active_human_pauses',
    ok: true,
    level: 'info',
    message: ready
      ? activeHumanPauses > 0
        ? `${activeHumanPauses} שיחות בהשתלטות אנושית (הבוט מושתק בהן עד סיום החלון / «החזר לבוט»)`
        : 'אין שיחות מושהות — הבוט פעיל בכל השיחות'
      : 'לא ניתן לבדוק השתלטות בלי Supabase',
    owner: 'ops',
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
