import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { BrandMark } from '@/components/brand/brand-mark'
import { Panel, Skeleton } from '@/components/ui/primitives'

export default function TicketDetailLoading() {
  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={28} className="rounded-[var(--radius-md)]" alt="" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-52" />
          <div className="flex gap-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </Panel>
          <Panel className="flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </Panel>
        </div>
      </div>
    </OpsAppShell>
  )
}
