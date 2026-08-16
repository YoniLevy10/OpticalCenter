import { AppShell } from '@/components/layout/app-shell'
import { Panel, Skeleton } from '@/components/ui/primitives'

export default function TicketDetailLoading() {
  return (
    <AppShell>
      <div className="space-y-4">
        <Skeleton className="h-3 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-52" />
          <div className="flex gap-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </Panel>
          <Panel className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}
