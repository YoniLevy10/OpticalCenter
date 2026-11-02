'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { usePhrase } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SegmentedButtons } from '@/components/ui/segmented'
import type { DecisionItem } from '@/modules/decisions/queue'
import { approveSpendFromQueue } from './decision-actions'

export function DecisionBoard({
  overdue,
  today,
  technicians,
}: {
  overdue: DecisionItem[]
  today: DecisionItem[]
  technicians: { id: string; name: string }[]
}) {
  const p = usePhrase()
  const [group, setGroup] = useState(overdue.length > 0 ? 'overdue' : 'today')
  const items = group === 'overdue' ? overdue : today
  const phoneItems = [...overdue, ...today]
  return (
    <>
    <div className="md:hidden">
      <PhoneDecisions items={phoneItems} />
    </div>
    <section
      className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface md:block"
      style={
        group === 'overdue' && overdue.length > 0
          ? { borderInlineStartColor: 'var(--signal-critical)', borderInlineStartWidth: 3 }
          : group === 'today' && today.length > 0
            ? { borderInlineStartColor: 'var(--signal-warning)', borderInlineStartWidth: 3 }
            : undefined
      }
    >
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="t-section text-ink">{p('תור החלטות')}</h2>
      </header>
      <div className="border-b border-border px-3 py-2">
        <SegmentedButtons
          fill
          mode="tabs"
          panelIdPrefix="decisions"
          activeKey={group}
          onChange={setGroup}
          segments={[
            { key: 'overdue', label: 'באיחור', count: overdue.length },
            { key: 'today', label: 'היום', count: today.length },
          ]}
        />
      </div>
      <div id={`decisions-${group}`} role="tabpanel">
        <DecisionQueue items={items} technicians={technicians} />
      </div>
    </section>
    </>
  )
}

/** Phone home: one store, one sentence, one big button. */
export function PhoneDecisions({ items }: { items: DecisionItem[] }) {
  const p = usePhrase()
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-5 py-12 text-center shadow-[var(--shadow-1)]">
        <p className="t-title text-ink">{p('הכל שקט')}</p>
        <p className="t-body mt-2 text-ink-2">
          {p('אין פריטים שמחכים להחלטה.')}
        </p>
      </div>
    )
  }

  const shown = items.slice(0, 4)
  const extra = items.length - shown.length

  return (
    <ul className="flex flex-col gap-4">
      {shown.map((item) => {
        const verb = item.action.split('·')[0]?.trim() || p('לשייך')
        const late = item.urgency === 'overdue'
        return (
          <li
            key={item.id}
            className={cn(
              'sheet flex flex-col gap-3 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-5',
              late && 'edge edge-overdue',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="t-title text-ink">{item.storeName}</h2>
              {late ? (
                <span className="t-meta shrink-0 rounded-full bg-[var(--signal-critical-soft)] px-2.5 py-1 font-semibold text-[var(--signal-critical)]">
                  {p('באיחור')}
                </span>
              ) : null}
            </div>
            <p className="t-lead text-ink">{item.title}</p>
            <Button
              asChild
              variant="primary"
              size="touch"
              className="w-full"
            >
              <Link href={item.href}>{verb}</Link>
            </Button>
          </li>
        )
      })}
      {extra > 0 ? (
        <li>
          <Button asChild variant="secondary" size="touch" className="w-full">
            <Link href="/ops/tickets">{p('תקלות פתוחות')}</Link>
          </Button>
        </li>
      ) : null}
    </ul>
  )
}

export function DecisionQueue({
  items,
}: {
  items: DecisionItem[]
  technicians?: { id: string; name: string }[]
}) {
  const p = usePhrase()
  if (items.length === 0) {
    return <p className="t-body px-4 py-8 text-ink-3">{p('אין פריטים בקבוצה הזו.')}</p>
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <DecisionRow key={item.id} item={item} />
      ))}
    </ul>
  )
}

function DecisionRow({ item }: { item: DecisionItem }) {
  const p = usePhrase()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<void>) {
    setError(null)
    start(async () => {
      try {
        await action()
      } catch (err) {
        setError(err instanceof Error ? err.message : p('הפעולה נכשלה'))
      }
    })
  }

  return (
    <li
      className={cn(
        'flex flex-col gap-3 bg-surface px-4 py-4',
        item.urgency === 'overdue' && 'edge edge-overdue',
      )}
    >
      <Link href={item.href} className="flex flex-col gap-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="t-lead text-ink">{item.storeName}</span>
          <span className="t-meta shrink-0 text-ink-3">{item.owner}</span>
        </span>
        <span className="t-body text-ink">{item.title}</span>
      </Link>
      <p className="t-meta text-ink-2">{item.action}</p>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        {item.ticketId ? (
          <Button asChild variant="primary" size="touch" className="w-full md:w-auto">
            <Link href={item.href}>{item.action.split('·')[0]?.trim() || p('לאשר')}</Link>
          </Button>
        ) : null}
        {item.spendId ? (
          <Button
            type="button"
            size="touch"
            variant="primary"
            className="w-full md:w-auto"
            disabled={pending}
            onClick={() => run(() => approveSpendFromQueue(item.spendId!))}
          >
            לאשר
          </Button>
        ) : null}
        {error ? (
          <span className="t-body text-[var(--signal-critical)]">{error}</span>
        ) : null}
      </div>
    </li>
  )
}
