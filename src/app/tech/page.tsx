import { TechShell } from '@/components/layout/tech-shell'
import { TechJobList } from '@/app/tech/tech-job-list'
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
        techId ? `טכנאי · ${techId.slice(0, 8)}…` : 'MVP · העבירו techId בשורת הכתובת'
      }
      techId={techId}
    >
      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <TechJobList tickets={tickets} techId={techId} fromDb={fromDb} />
    </TechShell>
  )
}
