import { TechShell } from '@/components/layout/tech-shell'
import { Skeleton } from '@/components/ui/primitives'

export default function TechLoading() {
  return (
    <TechShell title="העבודות שלי" eyebrow="Optical Center · טכנאי">
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="-mx-4 divide-y divide-border border-y border-border bg-surface sm:mx-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 px-4 py-4">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </TechShell>
  )
}
