import { TechShell } from '@/components/layout/tech-shell'
import { TechJobList } from '@/app/tech/tech-job-list'
import { TechRealtimeHint } from '@/app/tech/tech-realtime-hint'
import { ErrorState, Notice } from '@/components/ui/primitives'
import { fetchTechTickets, resolveTechId } from '@/modules/tickets/tech'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'

export const dynamic = 'force-dynamic'

export default async function TechPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ techId?: string }>
}) {
  const params = await searchParams
  const techId = resolveTechId(params.techId ?? null)
  const { tickets, error } = await fetchTechTickets(techId)

  const openCount = tickets.filter((t) =>
    OPEN_TICKET_STATUSES.includes(t.status as never),
  ).length

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

      {!techId ? (
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
