'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildPresets(now = new Date()) {
  const today = isoDate(now)
  const d7 = new Date(now)
  d7.setDate(d7.getDate() - 6)
  const d30 = new Date(now)
  d30.setDate(d30.getDate() - 29)
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  return [
    { key: '7d', label: '7 ימים', from: isoDate(d7), to: today },
    { key: '30d', label: '30 ימים', from: isoDate(d30), to: today },
    { key: 'month', label: 'החודש', from: thisMonthStart, to: today },
    {
      key: 'last',
      label: 'חודש קודם',
      from: isoDate(lastMonthDate),
      to: isoDate(lastMonthEnd),
    },
    { key: 'all', label: 'הכל', from: '', to: '' },
  ] as const
}

function reportsHref(opts: {
  from?: string
  to?: string
  status?: string
}) {
  const params = new URLSearchParams()
  if (opts.from) params.set('from', opts.from)
  if (opts.to) params.set('to', opts.to)
  if (opts.status) params.set('status', opts.status)
  const q = params.toString()
  return q ? `/ops/reports?${q}` : '/ops/reports'
}

export function ReportsFilters({
  from,
  to,
  status,
}: {
  from?: string
  to?: string
  status?: string
}) {
  const router = useRouter()
  const presets = buildPresets()
  const activePreset = presets.find((p) => p.from === (from ?? '') && p.to === (to ?? ''))

  function apply(form: HTMLFormElement) {
    const data = new FormData(form)
    router.replace(
      reportsHref({
        from: String(data.get('from') ?? ''),
        to: String(data.get('to') ?? ''),
        status: String(data.get('status') ?? '') || undefined,
      }),
    )
  }

  return (
    <Panel elevated className="!p-4 md:!p-5">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = activePreset?.key === p.key
          return (
            <Button
              key={p.key}
              asChild
              variant={active ? 'primary' : 'secondary'}
              size="sm"
            >
              <Link
                href={reportsHref({
                  from: p.from,
                  to: p.to,
                  status,
                })}
                aria-current={active ? 'page' : undefined}
              >
                {p.label}
              </Link>
            </Button>
          )
        })}
      </div>

      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          apply(e.currentTarget)
        }}
      >
        <Field label="מתאריך" htmlFor="reports-from">
          <Input
            id="reports-from"
            name="from"
            type="date"
            dir="ltr"
            defaultValue={from ?? ''}
          />
        </Field>
        <Field label="עד תאריך" htmlFor="reports-to">
          <Input
            id="reports-to"
            name="to"
            type="date"
            dir="ltr"
            defaultValue={to ?? ''}
          />
        </Field>
        <Field label="סטטוס" htmlFor="reports-status">
          <select
            id="reports-status"
            name="status"
            defaultValue={status ?? ''}
            className={cn(
              't-control h-9 min-w-[9rem] rounded-[var(--radius-md)] border border-border bg-surface px-2.5 text-ink',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]',
            )}
          >
            <option value="">הכל</option>
            <option value="open">פתוחות</option>
            <option value="resolved">נפתרו / נסגרו</option>
          </select>
        </Field>
        <Button type="submit" variant="secondary" size="sm">
          החלת טווח
        </Button>
        {(from || to || status) && (
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
