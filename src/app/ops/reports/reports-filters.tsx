'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/primitives'

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

  return (
    <Panel elevated className="!p-4">
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
          החלת טווח
        </Button>
        {(from || to) && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/ops/reports">ניקוי</Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm" className="ms-auto">
          <Link href="/ops/reports/history">היסטוריית דוחות</Link>
        </Button>
      </form>
    </Panel>
  )
}
