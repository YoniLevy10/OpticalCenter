import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assign, createTicket } from '@/modules/tickets/service'
import { DEMO_TECH_ID } from '@/lib/data/memory-store'
import { resolveTechId } from '@/modules/tickets/tech'

export const dynamic = 'force-dynamic'

/**
 * Demo helper: seed a high-priority HVAC ticket for store 172 (IL),
 * optionally assign to the demo technician for /tech flow.
 *
 * GET or POST /api/demo/seed-ticket?assign=1
 */
async function seed(request: Request) {
  const url = new URL(request.url)
  const assignFlag =
    url.searchParams.get('assign') === '1' ||
    url.searchParams.get('assign') === 'true'

  try {
    let assetId: string | undefined
    try {
      const supabase = createAdminClient()
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('code', '172')
        .maybeSingle()

      if (store?.id) {
        const { data: asset } = await supabase
          .from('assets')
          .select('id')
          .eq('store_id', store.id)
          .eq('code', 'AC-04')
          .maybeSingle()
        assetId = asset?.id
      }
    } catch {
      // Memory backend — asset optional
    }

    const ticket = await createTicket({
      storeCode: '172',
      countryCode: 'IL',
      category: 'hvac',
      priority: 'high',
      source: 'demo',
      title: 'תקלת מיזוג — הדגמה',
      description:
        'יחידת המיזוג הראשית לא מקררת. טמפרטורה גבוהה באולם. נדרש טכנאי בהקדם.',
      reporterName: 'מנהל חנות',
      reporterPhone: '+972500000172',
      assetId,
    })

    let assigned = ticket
    const techId = resolveTechId(null) ?? DEMO_TECH_ID
    if (assignFlag) {
      assigned = await assign(ticket.id, techId, techId)
    }

    return NextResponse.json({
      ok: true,
      ticket: {
        id: assigned.id,
        display_number: assigned.display_number,
        status: assigned.status,
        priority: assigned.priority,
        assigned_to: assigned.assigned_to,
        store_code: '172',
      },
      detailPath: `/ops/tickets/${assigned.id}`,
      techPath: `/tech/${assigned.id}?techId=${encodeURIComponent(techId)}`,
      techId,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'שגיאה ביצירת תקלת הדגמה'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}

export async function GET(request: Request) {
  return seed(request)
}

export async function POST(request: Request) {
  return seed(request)
}
