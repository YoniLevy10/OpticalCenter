import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Panel, RowSkeleton, Skeleton } from '@/components/ui/primitives'

/** Mirrors premium tickets queue — hero + tabs + elevated list. */
export default function TicketsLoading() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-1)]">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <Panel flush elevated className="overflow-hidden">
          <div className="h-10 border-b border-border bg-surface-sunken/35" />
          <RowSkeleton rows={8} />
        </Panel>
      </div>
    </OpsAppShell>
  )
}
