import { AppShell } from '@/components/layout/app-shell'
import { BrandSplash } from '@/components/brand/brand-mark'
import { Panel, Skeleton } from '@/components/ui/primitives'

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <BrandSplash label="טוען…" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
        </div>
        <Panel className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Panel>
      </div>
    </AppShell>
  )
}
