import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader } from '@/components/ui/primitives'
import { InboxClient } from './inbox-client'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <AppShell>
      <div className="space-y-4">
        <PageToolbar
          backHref="/ops/dashboard"
          backLabel="חזרה ללוח בקרה"
          title="תיבת WhatsApp"
          meta="השתלטות אנושית"
          showRefresh
        />
        <PageHeader
          title="תיבת WhatsApp"
          meta="השתלטות אנושית"
          className="hidden md:flex"
        />
        <InboxClient />
      </div>
    </AppShell>
  )
}
