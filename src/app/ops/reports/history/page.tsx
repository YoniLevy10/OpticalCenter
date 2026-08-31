import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/primitives'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { ReportsHistoryClient } from './reports-history-client'

export const dynamic = 'force-dynamic'

export default async function ReportsHistoryPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5">
        <PageHeader
          className="hidden md:flex"
          title="היסטוריית דוחות"
          description="דוחות שמורים — הורדה ושיתוף"
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/reports">חזרה לדוחות</Link>
            </Button>
          }
        />
        <PageToolbar
          backHref="/ops/reports"
          backLabel="חזרה לדוחות"
          title="היסטוריית דוחות"
          showRefresh
        />
        <ReportsHistoryClient />
      </div>
    </OpsAppShell>
  )
}
