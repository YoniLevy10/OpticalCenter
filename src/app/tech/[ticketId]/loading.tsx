import { TechShell } from '@/components/layout/tech-shell'
import { Panel, Skeleton } from '@/components/ui/primitives'

export default function TechDetailLoading() {
  return (
    <TechShell title="טוען…" eyebrow="עבודה" backHref="/tech">
      <div className="space-y-4">
        <Panel className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </Panel>
        <Panel className="space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-11 w-full" />
        </Panel>
      </div>
    </TechShell>
  )
}
