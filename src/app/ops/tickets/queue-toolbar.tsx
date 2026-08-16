'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchField, Select, Field } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import { SegmentedLinks } from '@/components/ui/segmented'
import {
  QUEUE_SORTS,
  QUEUE_VIEWS,
  activeFilterCount,
  queueHref,
  type QueueFilters,
  type QueueView,
} from '@/modules/tickets/queue'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS_HE,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import { cn } from '@/lib/utils'

type StoreOption = { code: string; name: string }
type TechOption = { id: string; name: string }

/**
 * The attention strip replaces the old Overview page. These are live counts
 * that are FILTER LINKS, not KPI cards — clicking "חריגת SLA" takes you to the
 * work, which is what a maintenance manager actually wanted from a dashboard.
 */
export function AttentionStrip({
  counts,
  filters,
}: {
  counts: { open: number; breached: number; critical: number; unassigned: number }
  filters: QueueFilters
}) {
  const items = [
    {
      label: 'חריגת SLA',
      value: counts.breached,
      href: queueHref(filters, { view: 'open', sort: 'sla' }),
      tone: 'critical' as const,
    },
    {
      label: 'קריטי',
      value: counts.critical,
      href: queueHref(filters, { view: 'open', priority: 'critical' }),
      tone: 'critical' as const,
    },
    {
      label: 'לא משויך',
      value: counts.unassigned,
      href: queueHref(filters, { view: 'unassigned' }),
      tone: 'warning' as const,
    },
    {
      label: 'פתוחות',
      value: counts.open,
      href: queueHref(filters, { view: 'open' }),
      tone: 'idle' as const,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => {
        const lit = item.value > 0 && item.tone !== 'idle'
        return (
          <Link
            key={item.label}
            href={item.href}
            className="group inline-flex items-baseline gap-1.5"
          >
            <span
              className={cn(
                't-body t-num font-semibold',
                lit && item.tone === 'critical' && 'text-[var(--signal-critical)]',
                lit && item.tone === 'warning' && 'text-[var(--signal-warning)]',
                !lit && 'text-ink',
              )}
            >
              {item.value}
            </span>
            <span className="t-meta text-ink-2 transition-colors group-hover:text-ink">
              {item.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export function QueueToolbar({
  filters,
  viewCounts,
  stores,
  technicians,
  resultCount,
}: {
  filters: QueueFilters
  viewCounts: Record<QueueView, number>
  stores: StoreOption[]
  technicians: TechOption[]
  resultCount: number
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [q, setQ] = useState(filters.q ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Debounced instant search — an operational inbox filters as you type.
  useEffect(() => {
    const current = filters.q ?? ''
    if (q === current) return
    const id = setTimeout(() => {
      startTransition(() => {
        router.replace(queueHref(filters, { q: q || undefined }), {
          scroll: false,
        })
      })
    }, 220)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const extraFilters = activeFilterCount(filters)

  function setFilter(patch: Partial<QueueFilters>) {
    router.replace(queueHref(filters, patch), { scroll: false })
  }

  const chips = [
    filters.status && {
      label: TICKET_STATUS_LABELS_HE[filters.status as never] ?? filters.status,
      clear: { status: undefined },
    },
    filters.priority && {
      label:
        TICKET_PRIORITY_LABELS_HE[filters.priority as never] ?? filters.priority,
      clear: { priority: undefined },
    },
    filters.store && {
      label: `חנות ${filters.store}`,
      clear: { store: undefined },
    },
    filters.tech && {
      label:
        filters.tech === 'none'
          ? 'ללא טכנאי'
          : (technicians.find((t) => t.id === filters.tech)?.name ?? 'טכנאי'),
      clear: { tech: undefined },
    },
  ].filter(Boolean) as { label: string; clear: Partial<QueueFilters> }[]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedLinks
          scrollable
          activeKey={filters.view}
          segments={QUEUE_VIEWS.map((v) => ({
            key: v.key,
            label: v.label,
            count: viewCounts[v.key],
            href: queueHref(filters, { view: v.key }),
          }))}
        />

        <div className="ms-auto flex w-full items-center gap-2 md:w-auto">
          <SearchField
            value={q}
            onValueChange={setQ}
            placeholder="חיפוש מס׳ · חנות · תיאור"
            autoFocusKey="/"
            className="w-full md:w-72"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFiltersOpen(true)}
            className="shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">מסננים</span>
            {extraFilters > 0 ? (
              <span className="t-caption t-num rounded-full bg-[var(--tenant-soft)] px-1.5 text-[var(--tenant)]">
                {extraFilters}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setFilter(c.clear)}
              className="t-meta inline-flex min-h-[var(--tap)] items-center gap-1 rounded-full border border-border bg-surface px-3 text-ink-2 transition-colors hover:text-ink md:h-7 md:min-h-0"
            >
              {c.label}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <Link
            href={queueHref({ view: filters.view, sort: filters.sort, q: filters.q })}
            className="t-meta px-1 text-ink-3 hover:text-ink"
          >
            ניקוי
          </Link>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="t-meta t-num text-ink-3">{resultCount} תקלות</p>
      </div>

      <BottomSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="מסננים"
        description="מימדים עצמאיים — אפשר לשלב"
      >
        <div className="space-y-4">
          <Field label="סטטוס">
            <Select
              value={filters.status ?? ''}
              onChange={(e) => setFilter({ status: e.target.value || undefined })}
            >
              <option value="">הכל</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TICKET_STATUS_LABELS_HE[s]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="עדיפות">
            <Select
              value={filters.priority ?? ''}
              onChange={(e) => setFilter({ priority: e.target.value || undefined })}
            >
              <option value="">הכל</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABELS_HE[p]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="חנות">
            <Select
              value={filters.store ?? ''}
              onChange={(e) => setFilter({ store: e.target.value || undefined })}
            >
              <option value="">הכל</option>
              {stores.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} · {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="טכנאי">
            <Select
              value={filters.tech ?? ''}
              onChange={(e) => setFilter({ tech: e.target.value || undefined })}
            >
              <option value="">הכל</option>
              <option value="none">ללא טכנאי</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="מיון">
            <Select
              value={filters.sort}
              onChange={(e) =>
                setFilter({ sort: e.target.value as QueueFilters['sort'] })
              }
            >
              {QUEUE_SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Button
            variant="primary"
            size="block"
            onClick={() => setFiltersOpen(false)}
          >
            הצגת תוצאות
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
