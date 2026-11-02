import 'server-only'

import { send019Sms } from '@/lib/sms/019'
import { logEvent } from '@/lib/logging'
import {
  buildVisitFaultsSms,
  faultBelongsInVisitSms,
  isDeliverableTechPhone,
} from './visit-sms'

export type VisitSmsNotice = {
  ok: boolean
  line: string
}

export async function sendVisitFaultsSms(input: {
  vendorName: string
  vendorPhone: string | null | undefined
  storeName: string
  faults: { display: string; title: string; status: string; error?: string | null }[]
  visitId: string
}): Promise<VisitSmsNotice> {
  const faults = input.faults.filter((fault) =>
    faultBelongsInVisitSms({ status: fault.status, error: fault.error }),
  )
  if (faults.length === 0) {
    return { ok: false, line: 'לא נשלח SMS. התקלות עדיין ממתינות לאישור.' }
  }
  if (!isDeliverableTechPhone(input.vendorPhone)) {
    return { ok: false, line: 'אין מספר נייד לאיש המקצוע שנבחר.' }
  }
  const message = buildVisitFaultsSms({
    storeName: input.storeName,
    faults: faults.map((fault) => ({ display: fault.display, title: fault.title })),
  })
  const sent = await send019Sms({
    to: input.vendorPhone!,
    message,
    meta: { visitId: input.visitId, faults: faults.length },
  }).catch((err) => {
    logEvent('sms:019', 'error', 'visit_sms_threw', {
      visitId: input.visitId,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false as const, skipped: 'send_failed' }
  })
  if (sent.ok) {
    return { ok: true, line: `נשלח SMS אל ${input.vendorName}.` }
  }
  if (sent.skipped === 'disabled') {
    return { ok: false, line: 'ה-SMS לא יצא. קו 019 עדיין כבוי.' }
  }
  return { ok: false, line: 'ה-SMS לא יצא.' }
}
