import Link from 'next/link'
import { EvidenceGrid } from '@/components/ui/evidence'
import { Button } from '@/components/ui/button'
import { OpenCardScroll } from './open-card-scroll'
import type { TicketEvidence } from '@/modules/tickets/attachments'
import { EngagementPanel, type CompanionChoice } from '@/app/ops/tickets/[id]/engagement-panel'
import type { Engagement } from '@/modules/engagements/service'
import type { MidragPro } from '@/modules/vendors/midrag/live-results'

export function ApprovalCard({
  ticketId,
  store,
  category,
  fault,
  rangeLine,
  companionCount,
  photos,
  open,
  urgent,
  status,
  locked,
  pros,
  searchUrl,
  fallback,
  companions,
}: {
  ticketId: string
  store: string
  category: string
  fault: string
  rangeLine: string
  companionCount: number
  photos: TicketEvidence[]
  open: boolean
  urgent: boolean
  status: string
  locked: Engagement | null
  pros: MidragPro[]
  searchUrl: string
  fallback: boolean
  companions: CompanionChoice[]
}) {
  const shown = open ? photos : photos.slice(0, 1)
  return (
    <article
      className={
        open
          ? 'scroll-mt-16 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface max-md:scroll-mb-[calc(var(--bottomnav-h)+var(--bottomnav-gap)+var(--safe-b)+72px)]'
          : 'overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface'
      }
    >
      <OpenCardScroll active={open} />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="t-body-strong text-ink">{store}</p>
            <p className="t-meta text-ink-2">{category}</p>
          </div>
          {photos.length > 0 ? (
            <p className="t-meta shrink-0 text-ink-3">
              {photos.length === 1 ? 'תמונה אחת' : `${photos.length} תמונות`}
            </p>
          ) : null}
        </div>
        <p className="t-body text-ink">{fault}</p>
        <p className="t-meta text-ink-2">{rangeLine}</p>
        {companionCount > 0 ? (
          <p className="t-meta text-ink-2">
            {companionCount === 1
              ? 'תקלה לא דחופה אחת לאותו ביקור'
              : `${companionCount} תקלות לא דחופות לאותו ביקור`}
          </p>
        ) : null}
        {shown.length > 0 ? (
          <EvidenceGrid
            wide={open}
            className={open ? '-mx-4' : undefined}
            attachments={shown.map((photo) => ({ ...photo, proof_role: null }))}
          />
        ) : null}
        {open ? (
          <EngagementPanel
            ticketId={ticketId}
            urgent={urgent}
            status={status}
            locked={locked}
            pros={pros}
            searchUrl={searchUrl}
            fallback={fallback}
            companions={companions}
          />
        ) : (
          <Button asChild variant="primary" size="sm" className="max-md:w-full">
            <Link href={`/ops/approvals?open=${ticketId}`}>לאשר</Link>
          </Button>
        )}
      </div>
    </article>
  )
}
