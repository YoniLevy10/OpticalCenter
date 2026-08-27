import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
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
    <OpsAppShell>
      <div className="flex max-w-5xl flex-col gap-4">
        <PageToolbar
          backHref="/ops/settings"
          backLabel="חזרה להגדרות"
          title="משתמשים"
          meta="ניהול פרופילים והרשאות"
          showRefresh
        />
        <PageHeader
          title="משתמשים"
          description="טבלת משתמשים עם תפקיד, סניף, סטטוס והתחברות אחרונה — הרשאות בשפה עסקית."
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
    </OpsAppShell>
  )
}
