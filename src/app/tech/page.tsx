import { redirect } from 'next/navigation'
import { TechShell } from '@/components/layout/tech-shell'
import { RefreshButton } from '@/components/layout/refresh-button'
import { TechJobList } from '@/app/tech/tech-job-list'
import { TechRealtimeHint } from '@/app/tech/tech-realtime-hint'
import { TechPushSubscribe } from '@/app/tech/tech-push-subscribe'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { fetchTechTickets } from '@/modules/tickets/tech'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import {
  getServerActor,
  resolveServerTechId,
} from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorIsTech } from '@/lib/auth/types'

export const dynamic = 'force-dynamic'

export default async function TechPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ techId?: string }>
}) {
  const params = await searchParams
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const techId = resolveServerTechId(actor, params.techId ?? null)
  const { tickets: fetched, error } = await fetchTechTickets(techId)

  const tickets = techId
    ? fetched.filter((t) => t.assigned_to === techId)
    : []

  const openCount = tickets.filter((t) =>
    OPEN_TICKET_STATUSES.includes(t.status as never),
  ).length

  const missingTech =
    !techId || (actor && !actorIsTech(actor) && !shouldAllowDemoEntry())

  return (
    <TechShell
      title="העבודות שלי"
      eyebrow="MaintainOS · טכנאי"
      enablePullToRefresh
      headerActions={<RefreshButton label="רענון עבודות" />}
      subtitle={
        openCount > 0 ? (
          <span className="t-num">{openCount} עבודות פתוחות</span>
        ) : (
          'אין עבודות פתוחות'
        )
      }
    >
      <TechRealtimeHint />
      <TechPushSubscribe />

      {error ? (
        <div className="mb-3">
          <ErrorState
            title="לא ניתן לטעון עבודות"
            description="נסו לרענן. אם הבעיה נמשכת פנו למוקד."
            action={<RefreshButton label="רענון" />}
          />
        </div>
      ) : null}

      {missingTech ? (
        <div className="mb-3">
          <Notice tone="warning">
            לא זוהה טכנאי. פתחו את הקישור האישי שקיבלתם.
          </Notice>
        </div>
      ) : null}

      <TechJobList tickets={tickets} techId={techId} />
    </TechShell>
  )
}
