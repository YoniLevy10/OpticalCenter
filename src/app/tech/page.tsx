import { redirect } from 'next/navigation'
import { TechShell } from '@/components/layout/tech-shell'
import { TechJobList } from '@/app/tech/tech-job-list'
import { TechRealtimeHint } from '@/app/tech/tech-realtime-hint'
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

  // Session tech id first; query techId only for demo when no tech actor yet.
  const techId = resolveServerTechId(actor, params.techId ?? null)
  const { tickets: fetched, error } = await fetchTechTickets(techId)

  // Defense in depth: only jobs for this tech (plus unassigned pool for internals).
  const tickets = techId
    ? fetched.filter(
        (t) =>
          t.assigned_to === techId ||
          (!t.assigned_to && t.status === 'assigned'),
      )
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
      subtitle={
        openCount > 0 ? (
          <span className="t-num">{openCount} עבודות פתוחות</span>
        ) : (
          'אין עבודות פתוחות'
        )
      }
    >
      <TechRealtimeHint />

      {error ? (
        <div className="mb-3">
          <ErrorState
            title="לא ניתן לטעון עבודות"
            description="נסו לרענן. אם הבעיה נמשכת פנו למוקד."
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
