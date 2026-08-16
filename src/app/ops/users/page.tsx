import { AppShell } from '@/components/layout/app-shell'
import { PageHeader } from '@/components/ui/primitives'
import { UsersAdmin } from './users-admin'

export const dynamic = 'force-dynamic'

export default function UsersPage() {
  return (
    <AppShell>
      <div className="max-w-4xl space-y-4">
        <PageHeader title="משתמשים" meta="ניהול פרופילים והרשאות" />
        <UsersAdmin />
      </div>
    </AppShell>
  )
}
