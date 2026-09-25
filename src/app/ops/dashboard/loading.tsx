import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Panel, RowSkeleton, Skeleton } from '@/components/ui/primitives'

/** Mirrors premium dashboard geometry — hero + 4 pulse + lists. */
export default function DashboardLoading() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-surface px-5 py-5 shadow-[var(--shadow-1)] md:px-7 md:py-6">
          <div className="flex items-start gap-3.5">
            <Skeleton className="h-12 w-12 shrink-0 rounded-[var(--radius-md)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="min-h-[5.25rem] rounded-[var(--radius-lg)]"
            />
          ))}
        </div>
        <Skeleton className="h-4 w-80 max-w-full" />
        <Panel flush elevated className="overflow-hidden">
          <div className="h-10 border-b border-border bg-surface-sunken/35" />
          <RowSkeleton rows={5} />
        </Panel>
      </div>
    </OpsAppShell>
  )
}
