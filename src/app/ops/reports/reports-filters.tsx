'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/primitives'
import { ComingSoonBadge } from '@/components/ui/coming-soon-badge'

export function ReportsFilters({
  from,
  to,
}: {
  from?: string
  to?: string
}) {
  const router = useRouter()

  function apply(form: HTMLFormElement) {
    const data = new FormData(form)
    const params = new URLSearchParams()
    const f = String(data.get('from') ?? '')
    const t = String(data.get('to') ?? '')
    if (f) params.set('from', f)
    if (t) params.set('to', t)
    const q = params.toString()
    router.replace(q ? `/ops/reports?${q}` : '/ops/reports')
  }

  function exportFile(format: 'csv' | 'xlsx' | 'pdf') {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('format', format)
    window.location.href = `/api/reports/export?${params.toString()}`
  }

  return (
    <Panel elevated className="!p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/ops/reports">סיכום חי</Link>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link href="/ops/reports/history">היסטוריה</Link>
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          apply(e.currentTarget)
        }}
      >
        <Field label="מתאריך" htmlFor="reports-from">
          <Input id="reports-from" name="from" type="date" defaultValue={from ?? ''} />
        </Field>
        <Field label="עד תאריך" htmlFor="reports-to">
          <Input id="reports-to" name="to" type="date" defaultValue={to ?? ''} />
        </Field>
        <Button type="submit" variant="secondary" size="sm">
          סינון
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => exportFile('csv')}>
          ייצוא CSV
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => exportFile('xlsx')}>
          ייצוא Excel
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={() => exportFile('pdf')}>
          ייצוא PDF
        </Button>
      </form>
      <p className="t-caption mt-3 flex flex-wrap items-center gap-2 text-ink-3">
        <span>דוחות חודשיים נשמרים ב</span>
        <Link href="/ops/reports/history" className="text-ink-2 underline">
          היסטוריה
        </Link>
        <ComingSoonBadge />
        <span className="text-ink-3">· שליחה אוטומטית ב-email</span>
      </p>
    </Panel>
  )
}
