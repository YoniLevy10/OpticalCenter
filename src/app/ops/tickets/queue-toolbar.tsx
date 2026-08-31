'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState, useTransition } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchField, Select, Field } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import { SegmentedLinks } from '@/components/ui/segmented'
import { CreateTicketDialog } from '@/components/ops/create-ticket-dialog'
import {
  QUEUE_SORTS,
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

type StoreOption = { code: string; name: string }
type TechOption = { id: string; name: string }

/** Primary quick filters for the daily work loop. */
const PRIMARY_VIEWS: { key: QueueView; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'mine', label: 'שלי' },
  { key: 'urgent', label: 'דחופות' },
  { key: 'unassigned', label: 'עדיין בלי טכנאי' },
]

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

  const extraFilters = [
    filters.status,
    filters.priority,
    filters.store,
    filters.tech,
    filters.sort !== 'urgency' ? filters.sort : null,
  ].filter(Boolean).length

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
      label: `סניף ${filters.store}`,
      clear: { store: undefined },
    },
    filters.tech && {
      label:
        filters.tech === 'none'
          ? 'עדיין בלי טכנאי'
          : (technicians.find((t) => t.id === filters.tech)?.name ?? 'אחראי'),
      clear: { tech: undefined },
    },
    filters.sort !== 'urgency' && {
      label: QUEUE_SORTS.find((s) => s.key === filters.sort)?.label ?? filters.sort,
      clear: { sort: 'urgency' as const },
    },
  ].filter(Boolean) as { label: string; clear: Partial<QueueFilters> }[]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <SearchField
          value={q}
          onValueChange={setQ}
          placeholder="חיפוש…"
          autoFocusKey="/"
          className="min-w-0 flex-1"
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
        <Suspense fallback={null}>
          <CreateTicketDialog stores={stores} trigger="toolbar" />
        </Suspense>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <SegmentedLinks
          scrollable
          activeKey={filters.view}
          segments={PRIMARY_VIEWS.map((v) => ({
            key: v.key,
            label: v.label,
            count: viewCounts[v.key],
            href: queueHref(filters, { view: v.key }),
          }))}
        />
        <p className="t-meta t-num shrink-0 text-ink-3">{resultCount}</p>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setFilter(c.clear)}
              className="t-meta inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-ink-2 transition-colors hover:text-ink"
            >
              {c.label}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <Link
            href={queueHref({ view: filters.view, sort: 'urgency', q: filters.q })}
            className="t-meta px-1 text-ink-3 hover:text-ink"
          >
            ניקוי
          </Link>
        </div>
      ) : null}

      <BottomSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="מסננים"
      >
        <div className="flex flex-col gap-4">
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
              onChange={(e) =>
                setFilter({ priority: e.target.value || undefined })
              }
            >
              <option value="">הכל</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABELS_HE[p]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="סניף">
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

          <Field label="אחראי">
            <Select
              value={filters.tech ?? ''}
              onChange={(e) => setFilter({ tech: e.target.value || undefined })}
            >
              <option value="">הכל</option>
              <option value="none">עדיין בלי טכנאי</option>
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
