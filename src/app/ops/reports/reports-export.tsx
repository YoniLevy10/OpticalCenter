'use client'

import { Button } from '@/components/ui/button'

export type ReportExportQuery = {
  from?: string
  to?: string
  month?: string
  store?: string
  status?: string
}

function exportHref(format: 'csv' | 'xlsx' | 'pdf', query: ReportExportQuery) {
  const params = new URLSearchParams({ format })
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.month) params.set('month', query.month)
  if (query.store) params.set('store', query.store)
  if (query.status) params.set('status', query.status)
  return `/api/reports/export?${params.toString()}`
}

export function ReportsExportActions({
  query,
  count,
  className,
}: {
  query: ReportExportQuery
  count: number
  className?: string
}) {
  function download(format: 'csv' | 'xlsx' | 'pdf') {
    window.location.href = exportHref(format, query)
  }

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => download('csv')}
      >
        ייצוא CSV{count > 0 ? ` (${count})` : ''}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => download('xlsx')}
      >
        Excel
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => download('pdf')}
      >
        PDF
      </Button>
    </div>
  )
}
