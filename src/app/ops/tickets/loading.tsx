import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { BrandMark } from '@/components/brand/brand-mark'
import { Panel, RowSkeleton, Skeleton } from '@/components/ui/primitives'

/** Mirrors the real queue geometry. Never a spinner. */
export default function TicketsLoading() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={28} className="rounded-[var(--radius-md)]" alt="" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="ms-auto h-8 w-28" />
        </div>
        <div className="flex gap-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="ms-auto h-10 w-64" />
        </div>
        <Panel flush className="overflow-hidden">
          <div className="h-9 border-b border-border bg-sunken/60" />
          <RowSkeleton rows={10} />
        </Panel>
      </div>
    </OpsAppShell>
  )
}
