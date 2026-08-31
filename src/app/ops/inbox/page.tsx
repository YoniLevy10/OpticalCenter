import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader, Skeleton } from '@/components/ui/primitives'
import { InboxClient } from './inbox-client'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה לראשי"
          title="הודעות"
          meta="WhatsApp"
          showRefresh
        />
        <PageHeader
          title="הודעות"
          description="שיחות WhatsApp — האם הבוט מטפל או שאתם עונים?"
          className="hidden md:flex"
        />
        <Suspense
          fallback={
            <div className="space-y-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-[420px] w-full" />
            </div>
          }
        >
          <InboxClient />
        </Suspense>
      </div>
    </OpsAppShell>
  )
}
