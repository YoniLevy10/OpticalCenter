import { AppShell } from '@/components/layout/app-shell'
import { BrandSplash } from '@/components/brand/brand-mark'
import { Panel, Skeleton } from '@/components/ui/primitives'

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <BrandSplash label="טוען…" />
        <Skeleton className="h-8 w-56 rounded-[var(--radius-md)]" />
        <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" />
        <Panel className="flex flex-col gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Panel>
      </div>
    </AppShell>
  )
}
