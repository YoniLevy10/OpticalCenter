'use client'

import { Button } from '@/components/ui/button'

type Row = Record<string, string | number | null | undefined>

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return ''
  const keys = Object.keys(rows[0]!)
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join(
    '\n',
  )
}

export function ReportsExportButton({
  rows,
  filename,
}: {
  rows: Row[]
  filename: string
}) {
  function download() {
    const csv = '\uFEFF' + toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={download}>
      ייצוא CSV
    </Button>
  )
}
