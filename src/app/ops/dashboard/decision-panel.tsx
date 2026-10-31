'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Panel, PanelHeader } from '@/components/ui/primitives'
import { SegmentedButtons } from '@/components/ui/segmented'
import { Tx } from '@/components/i18n/tx'
import { cn } from '@/lib/utils'
import type { DecisionItem } from '@/modules/decisions/queue'
import { DecisionQueue } from './decision-queue'

type Tab = 'overdue' | 'today'

/**
 * Single decision console: Overdue / Today segments.
 * Replaces the two stacked decision panels on the dashboard.
 */
export function DecisionPanel({
  overdue,
  today,
  technicians,
}: {
  overdue: DecisionItem[]
  today: DecisionItem[]
  technicians: { id: string; name: string }[]
}) {
  const defaultTab: Tab =
    overdue.length > 0 ? 'overdue' : today.length > 0 ? 'today' : 'overdue'
  const [tab, setTab] = useState<Tab>(defaultTab)

  const items = tab === 'overdue' ? overdue : today
  const criticalEdge = tab === 'overdue' && overdue.length > 0
  const warningEdge = tab === 'today' && today.length > 0

  const segments = useMemo(
    () => [
      { key: 'overdue', label: 'באיחור', count: overdue.length },
      { key: 'today', label: 'היום', count: today.length },
    ],
    [overdue.length, today.length],
  )

  return (
    <Panel
      flush
      elevated
      className={cn(
        'overflow-hidden',
        (criticalEdge || warningEdge) && 'border-s-[3px]',
      )}
      style={
        criticalEdge
          ? { borderInlineStartColor: 'var(--signal-critical)' }
          : warningEdge
            ? { borderInlineStartColor: 'var(--signal-warning)' }
            : undefined
      }
    >
      <PanelHeader
        title="דורש החלטה"
        meta={
          overdue.length + today.length > 0
            ? String(overdue.length + today.length)
            : undefined
        }
        action={
          <Link
            href="/ops/tickets?view=open"
            className="t-caption font-medium text-[var(--tenant)] hover:underline"
          >
            <Tx text="כל הפתוחות" />
          </Link>
        }
      />
      <div className="border-b border-border px-3 py-2">
        <SegmentedButtons
          fill
          mode="tabs"
          panelIdPrefix="dash-decisions"
          activeKey={tab}
          onChange={(key) => setTab(key as Tab)}
          segments={segments}
        />
      </div>
      <div
        id={`dash-decisions-${tab}`}
        role="tabpanel"
        aria-labelledby={`dash-decisions-tab-${tab}`}
      >
        <DecisionQueue items={items} technicians={technicians} />
      </div>
    </Panel>
  )
}
