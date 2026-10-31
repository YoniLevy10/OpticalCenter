'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'
import { usePhrase } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AriHomeModel } from '@/modules/ops/ari-home'
export type AriHomeStats = {
  open: number
  closedToday: number
  overdue: number
  unassigned: number
}

export function AriHomeBoard({
  model,
  stats,
  ticketCost = {},
  storeCost = {},
  notice,
}: {
  model: AriHomeModel
  stats: AriHomeStats
  ticketCost?: Record<string, string>
  storeCost?: Record<string, string>
  notice: string | null
}) {
  const p = usePhrase()
  const [openStore, setOpenStore] = useState<string | null>(
    () => model.stores[0]?.id ?? null,
  )
  const metrics: {
    href: string
    label: string
    value: number
    accent: boolean
  }[] = [
    {
      href: '/ops/tickets?view=open',
      label: p('פתוחות'),
      value: stats.open,
      accent: false,
    },
    {
      href: '/ops/tickets?view=resolved',
      label: p('נסגרו היום'),
      value: stats.closedToday,
      accent: false,
    },
    {
      href: '/ops/tickets?view=attention',
      label: p('באיחור'),
      value: stats.overdue,
      accent: stats.overdue > 0,
    },
    {
      href: '/ops/tickets?view=open&tech=none',
      label: p('בלי שיוך'),
      value: stats.unassigned,
      accent: false,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {notice ? (
        <p role="status" className="t-body text-ink">
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="flex min-h-[5.75rem] min-w-0 flex-col justify-between rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-4"
          >
            <span
              className={cn(
                't-num block text-[2.125rem] font-semibold leading-none tracking-tight',
                metric.accent ? 'text-[var(--tenant)]' : 'text-ink',
              )}
            >
              {metric.value}
            </span>
            <span className="t-body mt-3 block text-ink-2">{metric.label}</span>
          </Link>
        ))}
      </div>

      <section>
        <header className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="t-section text-ink">{p('סניפים לטיפול')}</h2>
            <span aria-hidden className="clay-rule" />
          </div>
          <span className="t-meta t-num text-ink-3">{model.stores.length}</span>
        </header>

        {model.stores.length === 0 ? (
          <p className="t-title rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-10 text-center text-ink">
            {p('הכל שקט')}
          </p>
        ) : (
          <div className="store-stack">
            {model.stores.map((store) => {
              const openHere = store.categories.reduce(
                (sum, category) => sum + category.rows.length,
                0,
              )
              const open = openStore === store.id
              const range = storeCost[store.id]
              return (
                <article
                  key={store.id}
                  data-active={open ? 'true' : undefined}
                  className="sheet overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface"
                >
                  <h3>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenStore(open ? null : store.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
                    >
                      <span className="min-w-0">
                        <span className="t-body-strong block truncate text-ink">{store.name}</span>
                        {store.code ? (
                          <span className="t-meta t-num block text-ink-3">{store.code}</span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="t-caption rounded-full bg-surface-sunken px-2.5 py-1 text-ink-2">
                          <span className="t-num">{openHere}</span> {p('פתוחות')}
                        </span>
                        <ChevronDown
                          className={cn('h-4 w-4 text-ink-2 transition-transform', open && 'rotate-180')}
                          aria-hidden
                        />
                      </span>
                    </button>
                  </h3>

                  {open ? (
                    <div className="border-t border-border">
                      <div className="px-4 py-4">
                        <p className="t-caption text-ink-3">{p('נרשם')}</p>
                        <p className="t-title t-num mt-1 text-ink">
                          {range || p('אין עדיין מחיר')}
                        </p>
                        <p className="t-meta mt-1 text-ink-2">
                          {p('רק סכום שנרשם על התקלות האלה')}
                        </p>
                      </div>
                      <PhoneFoldStack>
                      {store.categories.map((category) => (
                        <PhoneFold
                          key={category.key}
                          title={category.label}
                          summary={`${category.rows.length} · ${category.advice}`}
                        >
                        <div className="border-t border-border first:border-t-0">
                          <p className="t-caption px-4 pt-3 text-ink-3">{category.label}</p>
                          <ul>
                            {category.rows.map((row) => (
                              <li key={row.id}>
                                <Link
                                  href={row.href}
                                  className={cn(
                                    'flex min-w-0 items-start justify-between gap-3 px-4 py-3 hover:bg-surface-sunken/40',
                                    row.overdue && 'edge edge-overdue',
                                  )}
                                >
                                  <span className="min-w-0">
                                    <span className="t-body block text-ink">{row.problem}</span>
                                    <span
                                      className={cn(
                                        't-meta mt-1 block',
                                        row.overdue
                                          ? 'font-semibold text-[var(--tenant)]'
                                          : 'text-ink-3',
                                      )}
                                    >
                                      {row.openFor}
                                    </span>
                                    {ticketCost[row.id] ? (
                                      <span className="t-meta t-num mt-1 block text-ink-2">
                                        {ticketCost[row.id]}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="t-caption shrink-0 rounded-full bg-surface-sunken px-2 py-1 text-ink-2">
                                    {row.status}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          <div className="flex items-center justify-between gap-3 px-4 pb-3">
                            <p className="t-meta min-w-0 text-ink-2">{category.advice}</p>
                            {category.urgent ? (
                              <Button asChild variant="primary" size="sm" className="shrink-0">
                                <Link href={category.actionHref}>{category.actionLabel}</Link>
                              </Button>
                            ) : (
                              <Link
                                href={category.actionHref}
                                className="t-meta shrink-0 text-ink"
                              >
                                {category.actionLabel}
                              </Link>
                            )}
                          </div>
                          {category.prevention ? (
                            <p className="t-meta px-4 pb-3 text-ink-2">{category.prevention}</p>
                          ) : null}
                        </div>
                        </PhoneFold>
                      ))}
                      </PhoneFoldStack>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        {model.moreStores > 0 ? (
          <div className="px-1 py-3">
            <Link href="/ops/tickets?view=open" className="t-body-strong text-ink">
              {p('עוד סניפים')}
              <span className="t-num"> {model.moreStores}</span>
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
