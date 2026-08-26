'use client'

import { TicketReportForm } from '@/components/report/ticket-report-form'

export function PublicReportForm({
  initialStore,
  stores,
}: {
  initialStore: string
  stores: { code: string; name: string; id?: string }[]
}) {
  return (
    <TicketReportForm
      apiUrl="/api/report"
      initialStore={initialStore}
      stores={stores}
      showWhatsApp
    />
  )
}
