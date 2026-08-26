import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { PageHeader } from '@/components/ui/primitives'
import { UsersAdmin } from './users-admin'
import { fetchStores } from '@/modules/stores/data'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  const { stores } = await fetchStores()

  return (
    <AppShell>
      <div className="max-w-5xl space-y-4">
        <PageToolbar
          backHref="/ops/settings"
          backLabel="חזרה להגדרות"
          title="משתמשים"
          meta="ניהול פרופילים והרשאות"
          showRefresh
        />
        <PageHeader
          title="משתמשים"
          meta="ניהול פרופילים והרשאות"
          className="hidden md:flex"
        />
        <UsersAdmin
          stores={stores.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
          }))}
        />
      </div>
    </AppShell>
  )
}
