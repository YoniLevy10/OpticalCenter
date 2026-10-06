'use client'

import { TicketReportForm } from '@/components/report/ticket-report-form'

export function PublicReportForm({
  initialStore,
  stores,
  locked = false,
}: {
  initialStore: string
  stores: { code: string; name: string; id?: string }[]
  locked?: boolean
}) {
  return (
    <TicketReportForm
      apiUrl="/api/report"
      initialStore={initialStore}
      stores={stores}
      locked={locked}
      showWhatsApp
    />
  )
}
