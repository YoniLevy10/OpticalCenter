'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { usePhrase } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import type { DecisionItem } from '@/modules/decisions/queue'
import {
  approveSpendFromQueue,
  assignFromQueue,
  requestInfoFromQueue,
} from './decision-actions'

export function DecisionQueue({
  items,
  technicians,
}: {
  items: DecisionItem[]
  technicians: { id: string; name: string }[]
}) {
  const p = usePhrase()
  if (items.length === 0) {
    return <p className="t-body px-4 py-8 text-ink-3">{p('אין פריטים בקבוצה הזו.')}</p>
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <DecisionRow key={item.id} item={item} technicians={technicians} />
      ))}
    </ul>
  )
}

function DecisionRow({
  item,
  technicians,
}: {
  item: DecisionItem
  technicians: { id: string; name: string }[]
}) {
  const p = usePhrase()
  const [tech, setTech] = useState(technicians[0]?.id ?? '')
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
    <li className="flex flex-col gap-2 bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={item.href} className="t-body text-ink">
          {item.title}
        </Link>
        <span className="t-meta shrink-0 text-ink-3">{item.owner}</span>
      </div>
      <Link href={`/ops/stores/${item.storeCode}`} className="t-meta text-ink-2">
        {item.storeCode} · {item.storeName}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        {item.ticketId ? (
          <>
            <select
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
              value={tech}
              onChange={(event) => setTech(event.target.value)}
              aria-label={p('בחירת אחראי')}
            >
              {technicians.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending || !tech}
              onClick={() => run(() => assignFromQueue(item.ticketId!, tech))}
            >
              לשייך
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => requestInfoFromQueue(item.ticketId!))}
            >
              לבקש מידע
            </Button>
          </>
        ) : null}
        {item.spendId ? (
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() => run(() => approveSpendFromQueue(item.spendId!))}
          >
            לאשר
          </Button>
        ) : null}
        {error ? <span className="text-[var(--signal-critical)]">{error}</span> : null}
      </div>
    </li>
  )
}
