import Link from 'next/link'
import type { DuePaper } from '@/modules/ops/agent-chat'
import type { BundleCard } from '@/modules/whatsapp/agent/bundle'

export function AriProductionStrip({
  urgent,
  bundles,
  papers,
}: {
  urgent: { id: string; storeName: string; summary: string }[]
  bundles: BundleCard[]
  papers: DuePaper[]
}) {
  const suggestions = bundles.filter((card) => card.kind === 'urgent' && card.ticketIds.length > 1)
  return (
    <section className="grid gap-3">
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h2 className="t-section text-ink">דחופות שמחכות לאישור</h2>
        {urgent.length === 0 ? (
          <p className="t-body mt-2 text-ink-2">אין דחופה שמחכה לארי.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {urgent.slice(0, 6).map((row) => (
              <li key={row.id}>
                <Link href={`/ops/tickets/${row.id}`} className="t-body text-ink underline">
                  {row.storeName} · {row.summary}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h2 className="t-section text-ink">שילוב ביקור</h2>
        {suggestions.length === 0 ? (
          <p className="t-body mt-2 text-ink-2">אין עכשיו תקלה לא דחופה באותה חנות או מחוז.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {suggestions.slice(0, 4).map((card) => (
              <li key={card.id}>
                <Link href={`/ops/tickets/${card.ticketIds[0]}`} className="t-body text-ink">
                  {card.sentence}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <h2 className="t-section text-ink">לחדש לפני שפג</h2>
        {papers.length === 0 ? (
          <p className="t-body mt-2 text-ink-2">אין אישור שעומד לפוג.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {papers.slice(0, 6).map((paper) => (
              <li key={`${paper.storeName}-${paper.label}`}>
                <Link href="/ops/documents" className="t-body text-ink">
                  {paper.storeName} · {paper.label}
                  {paper.overdue ? ' · פג' : ''}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
