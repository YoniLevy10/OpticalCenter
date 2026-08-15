import { TechShell } from '@/components/layout/tech-shell'
import { TechJobList } from '@/app/tech/tech-job-list'
import { TechRealtimeHint } from '@/app/tech/tech-realtime-hint'
import { fetchTechTickets, resolveTechId } from '@/modules/tickets/tech'

export const dynamic = 'force-dynamic'

export default async function TechPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ techId?: string }>
}) {
  const params = await searchParams
  const techId = resolveTechId(params.techId ?? null)
  const { tickets, fromDb, error } = await fetchTechTickets(techId)

  return (
    <TechShell
      title="העבודות שלי"
      subtitle={
        techId
          ? `צוות תחזוקה פנימי · ${techId.slice(0, 8)}…`
          : 'MVP · העבירו techId בשורת הכתובת'
      }
      techId={techId}
    >
      <TechRealtimeHint />
      {error ? (
        <div className="mb-3 rounded-[var(--radius-md)] border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </div>
      ) : null}
      <TechJobList tickets={tickets} techId={techId} fromDb={fromDb} />
    </TechShell>
  )
}

