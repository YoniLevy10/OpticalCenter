import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { Skeleton } from '@/components/ui/primitives'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { InboxClient } from './inbox-client'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 stagger">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה"
          showRefresh
        />
        <OpsPageHero
          title="תיבת WhatsApp"
          status="השתלטות אנושית על שיחות — בוט ממשיך בשאר"
        />
        <Suspense
          fallback={
            <div className="space-y-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-[420px] w-full rounded-[var(--radius-lg)]" />
            </div>
          }
        >
          <InboxClient />
        </Suspense>
      </div>
    </OpsAppShell>
  )
}
