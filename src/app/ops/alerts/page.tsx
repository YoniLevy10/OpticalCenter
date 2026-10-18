import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'
import { canAccessAlertsCenter } from '@/modules/alerts/center'
import { loadAlertsCenter } from '@/modules/alerts/load'
import { AlertsClient } from './alerts-client'

export const dynamic = 'force-dynamic'

export default async function OpsAlertsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  if (actor && !canAccessAlertsCenter(actor)) redirect('/ops/dashboard')

  const locale = await getLocale()
  const p = (text: string) => phrase(locale, text)
  const center = await loadAlertsCenter({ actor, locale })

  const statusLine = center.partialFailure
    ? p('חלק מהמקורות לא נטענו')
    : center.open.length === 0
      ? p('אין פעולות פתוחות')
      : `${center.open.length} ${p('פעולות פתוחות')}`

  return (
    <OpsAppShell>
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5">
        <OpsPageHero title={p('מרכז התראות')} status={statusLine} />
        <AlertsClient
          open={center.open}
          history={center.history}
          sources={center.sources}
          partialFailure={center.partialFailure}
        />
      </div>
    </OpsAppShell>
  )
}
