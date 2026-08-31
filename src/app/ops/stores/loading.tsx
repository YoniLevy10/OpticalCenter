import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { BrandMark } from '@/components/brand/brand-mark'
import { Panel, RowSkeleton, Skeleton } from '@/components/ui/primitives'

export default function StoresLoading() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={28} className="rounded-[var(--radius-md)]" alt="" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-10 w-72" />
        <Panel flush className="overflow-hidden">
          <div className="h-9 border-b border-border bg-sunken/60" />
          <RowSkeleton rows={8} />
        </Panel>
      </div>
    </OpsAppShell>
  )
}
