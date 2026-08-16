'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { SegmentedButtons } from '@/components/ui/segmented'
import { EmptyState } from '@/components/ui/primitives'
import { StatusLabel } from '@/components/ui/signal'
import { LiveSla } from '@/components/ui/time'
import { techHref } from '@/lib/tech-href'
import {
  TECH_TAB_LABELS_HE,
  filterTicketsByTab,
  type TechTab,
  type TechTicketRow,
} from '@/modules/tickets/tech'

const TABS: TechTab[] = ['new_assigned', 'in_progress', 'done']

const EMPTY_COPY: Record<
  TechTab,
  { title: string; description: string; icon: LucideIcon }
> = {
  new_assigned: {
    title: 'אין עבודות חדשות',
    description: 'כשמשייכים לך תקלה היא תופיע כאן.',
    icon: ClipboardList,
  },
  in_progress: {
    title: 'אין עבודות בטיפול',
    description: 'התחילו עבודה מהרשימה כדי שתופיע כאן.',
    icon: PlayCircle,
  },
  done: {
    title: 'אין עבודות שהושלמו',
    description: 'עבודות שתסיימו יופיעו כאן.',
    icon: CheckCircle2,
  },
}

export function TechJobList({
  tickets,
  techId,
}: {
  tickets: TechTicketRow[]
  techId: string | null
}) {
  const [tab, setTab] = useState<TechTab>('new_assigned')

  const filtered = useMemo(() => filterTicketsByTab(tickets, tab), [tickets, tab])
  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t, filterTicketsByTab(tickets, t).length]),
      ) as Record<TechTab, number>,
    [tickets],
  )

  return (
    <div className="space-y-3">
      <SegmentedButtons
        fill
        activeKey={tab}
        onChange={(k) => setTab(k as TechTab)}
        segments={TABS.map((t) => ({
          key: t,
          label: TECH_TAB_LABELS_HE[t],
          count: counts[t],
        }))}
      />

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
          <EmptyState
            title={EMPTY_COPY[tab].title}
            description={EMPTY_COPY[tab].description}
            icon={EMPTY_COPY[tab].icon}
          />
        </div>
      ) : (
        /* Full-bleed rows, edge-to-edge on the phone — cards would waste ~32px
           of horizontal space per job and cut visible work by a third. */
        <div className="-mx-4 overflow-hidden border-y border-border sm:mx-0 sm:rounded-[var(--radius-lg)] sm:border">
          <RowList>
            {filtered.map((t) => (
              <OperationalRow
                key={t.id}
                href={techHref(`/tech/${t.id}`, techId)}
                priority={t.priority}
                leading={t.display_number ?? `OC-${t.number}`}
                trailing={<LiveSla ticket={t} />}
                title={t.stores?.name ?? 'חנות'}
                subtitle={t.description || t.title || ''}
                footer={
                  <>
                    <StatusLabel status={t.status} />
                    {t.stores?.city ? (
                      <>
                        <Dot />
                        <span className="t-meta truncate text-ink-2">
                          {t.stores.city}
                        </span>
                      </>
                    ) : null}
                  </>
                }
              />
            ))}
          </RowList>
        </div>
      )}
    </div>
  )
}
