import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Button } from '@/components/ui/button'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { ReportsHistoryClient } from './reports-history-client'

export const dynamic = 'force-dynamic'

export default async function ReportsHistoryPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <PageToolbar
          backHref="/ops/reports"
          backLabel="חזרה לדוחות"
          showRefresh
        />

        <OpsPageHero
          title="היסטוריית דוחות"
          status="דוחות חודשיים שמורים — יצירה, הורדה ושיתוף"
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/reports">חזרה לסיכום</Link>
            </Button>
          }
        />

        <ReportsHistoryClient />
      </div>
    </OpsAppShell>
  )
}
