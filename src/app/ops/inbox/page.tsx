import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Skeleton } from '@/components/ui/primitives'
import { InboxClient } from './inbox-client'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="flex min-h-0 flex-1 flex-col md:mx-auto md:w-full md:max-w-[880px] md:gap-4">
        <h1 className="t-display hidden text-ink md:block">WhatsApp</h1>
        <Suspense
          fallback={
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 md:p-0">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="min-h-0 flex-1 w-full rounded-[var(--radius-lg)]" />
            </div>
          }
        >
          <InboxClient />
        </Suspense>
      </div>
    </OpsAppShell>
  )
}
