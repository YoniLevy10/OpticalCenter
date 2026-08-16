import { AppShell } from '@/components/layout/app-shell'
import { Panel, RowSkeleton, Skeleton } from '@/components/ui/primitives'

export default function StoresLoading() {
  return (
    <AppShell>
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-72" />
        <Panel flush className="overflow-hidden">
          <div className="h-9 border-b border-border bg-sunken/60" />
          <RowSkeleton rows={8} />
        </Panel>
      </div>
    </AppShell>
  )
}
