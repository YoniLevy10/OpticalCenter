import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTicket } from '@/modules/tickets/service'

/**
 * Demo helper: seed a high-priority HVAC ticket for store 172 (IL).
 * Safe for local/demo scripts — no secrets returned.
 */
export async function POST() {
  try {
    const supabase = createAdminClient()

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('code', '172')
      .eq('country_id', '22222222-2222-2222-2222-222222222222')
      .maybeSingle()

    let assetId: string | undefined
    if (store?.id) {
      const { data: asset } = await supabase
        .from('assets')
        .select('id')
        .eq('store_id', store.id)
        .eq('code', 'AC-04')
        .maybeSingle()
      assetId = asset?.id
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

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticket.id,
        display_number: ticket.display_number,
        status: ticket.status,
        priority: ticket.priority,
        store_code: '172',
      },
      detailPath: `/ops/tickets/${ticket.id}`,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'שגיאה ביצירת תקלת הדגמה'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
