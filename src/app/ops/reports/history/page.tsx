import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
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
      <div className="flex flex-col gap-5">
        <div className="rounded-[var(--radius-xl)] bg-[var(--ink)] px-5 py-6 text-white shadow-[var(--shadow-pop)] md:px-8 md:py-7">
          <p className="t-caption text-white/60">OPERATIONS OS · ARCHIVE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            היסטוריית דוחות
          </h1>
          <p className="t-body mt-2 max-w-xl text-white/70">
            דוחות חודשיים שמורים — יצירה, הורדה ושיתוף.
          </p>
          <div className="mt-4">
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/reports">חזרה לסיכום חי</Link>
            </Button>
          </div>
        </div>
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
