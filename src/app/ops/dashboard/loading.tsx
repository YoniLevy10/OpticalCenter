import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Panel, RowSkeleton, Skeleton } from '@/components/ui/primitives'

/** Mirrors P0 dashboard — compact hero · decision panel · thin stat strip. */
export default function DashboardLoading() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Panel flush elevated className="overflow-hidden">
          <div className="flex h-11 items-center justify-between border-b border-border bg-surface-sunken/35 px-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="border-b border-border px-3 py-2">
            <Skeleton className="h-9 w-full rounded-[var(--radius-md)]" />
          </div>
          <RowSkeleton rows={4} />
        </Panel>
        <Skeleton className="h-11 w-full rounded-[var(--radius-lg)]" />
      </div>
    </OpsAppShell>
  )
}
