'use client'

import { TicketReportForm } from '@/components/report/ticket-report-form'

export function StoreReportForm({
  storeCode,
  storeName,
  locked,
}: {
  storeCode: string
  storeName: string
  locked?: boolean
}) {
  return (
    <TicketReportForm
      apiUrl="/api/store/tickets"
      initialStore={storeCode}
      stores={[{ code: storeCode, name: storeName }]}
      locked={locked}
      showWhatsApp
    />
  )
}
