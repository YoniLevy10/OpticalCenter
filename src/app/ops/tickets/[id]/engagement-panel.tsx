import {
  cancelEngagementAction,
  lockEngagementAction,
  setUrgentAction,
} from '@/app/ops/tickets/engagement-actions'
import type { Engagement } from '@/modules/engagements/service'
import { formatIls } from '@/modules/spend/true-cost'
import type { MidragPro } from '@/modules/vendors/midrag/live-results'
import { Button } from '@/components/ui/button'

export type CompanionChoice = {
  id: string
  storeName: string
  summary: string
}

export function EngagementPanel({
  ticketId,
  urgent,
  status,
  locked,
  pros,
  searchUrl,
  fallback,
  companions,
}: {
  ticketId: string
  urgent: boolean
  status: string
  locked: Engagement | null
  pros: MidragPro[]
  searchUrl: string
  fallback: boolean
  companions: CompanionChoice[]
}) {
  if (status === 'closed' || status === 'cancelled') return null

  if (locked && status === 'engaged') {
    return (
      <section className="grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <p className="t-body-strong text-ink">ארי יצא. מנהל החנות מתאם.</p>
        <p className="t-body text-ink-2">
          {locked.professionalName} · {locked.professionalPhone} ·{' '}
          {formatIls(locked.approvedAmount)}
        </p>
        <p className="t-meta text-ink-3">המחיר נעול. שינוי דורש ביטול וחזרה לתור.</p>
        <form action={cancelEngagementAction}>
          <input type="hidden" name="ticketId" value={ticketId} />
          <Button type="submit" variant="secondary" size="sm">
            בטל אישור
          </Button>
        </form>
      </section>
    )
  }

  return (
    <section className="grid gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="t-body-strong text-ink">{urgent ? 'דחוף' : 'לא דחוף'}</p>
        <form action={setUrgentAction}>
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="urgent" value={urgent ? '0' : '1'} />
          <Button type="submit" variant="secondary" size="sm">
            {urgent ? 'סמן כלא דחוף' : 'סמן כדחוף'}
          </Button>
        </form>
      </div>

      {urgent ? (
        <form action={lockEngagementAction} className="grid gap-3">
          <input type="hidden" name="ticketId" value={ticketId} />
          {pros.length > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="t-body-strong text-ink">מידרג באזור</legend>
              <p className="t-meta text-ink-3">טווח מידרג הוא לא המחיר שאושר.</p>
              <ul className="grid max-h-72 gap-2 overflow-y-auto">
                {pros.map((pro) => (
                  <li key={pro.id} className="rounded-[var(--radius-md)] border border-border px-3">
                    <label className="flex min-h-[var(--tap)] items-center gap-3 py-2">
                      <input
                        type="radio"
                        name="midrag"
                        value={`${pro.id}::${encodeURIComponent(pro.name)}`}
                        className="h-5 w-5 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="t-body block text-ink">
                          {pro.name}
                          {pro.rating != null ? ` · ${pro.rating}` : ''}
                          {pro.reviews != null ? ` · ${pro.reviews} חוות דעת` : ''}
                        </span>
                        <span className="t-meta block text-ink-3">
                          {pro.availability || 'זמינות לא צוינה'}
                          {pro.priceMin != null
                            ? ` · טווח ${formatIls(pro.priceMin)}${pro.priceMax != null ? `–${formatIls(pro.priceMax)}` : ''}`
                            : ''}
                        </span>
                        <a className="t-meta text-ink underline" href={pro.profileUrl} target="_blank" rel="noreferrer">
                          דברו איתי במידרג
                        </a>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : (
            <p className="t-body text-ink-2">
              {fallback ? 'מידרג לא נפתח עכשיו. ' : ''}
              <a className="underline" href={searchUrl} target="_blank" rel="noreferrer">
                פתח במידרג
              </a>
            </p>
          )}

          {companions.length > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="t-body-strong text-ink">לסגור באותו ביקור</legend>
              {companions.map((row) => (
                <label key={row.id} className="flex items-start gap-2">
                  <input type="checkbox" name="bundle" value={row.id} defaultChecked />
                  <span className="t-body text-ink">
                    {row.storeName} · {row.summary}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}

          <label className="grid gap-1">
            <span className="t-meta text-ink-2">שם אחרי השיחה</span>
            <input
              name="professional_name"
              className="min-h-11 rounded-[var(--radius-md)] border border-border bg-canvas px-3 text-base"
              placeholder="אם לא בחרת מהרשימה"
            />
          </label>
          <label className="grid gap-1">
            <span className="t-meta text-ink-2">טלפון</span>
            <input
              name="professional_phone"
              required
              inputMode="tel"
              className="min-h-11 rounded-[var(--radius-md)] border border-border bg-canvas px-3 text-base"
              placeholder="המספר שארי קיבל"
            />
          </label>
          <label className="grid gap-1">
            <span className="t-meta text-ink-2">מחיר שסוכם</span>
            <input
              name="approved_amount"
              required
              inputMode="decimal"
              className="min-h-11 rounded-[var(--radius-md)] border border-border bg-canvas px-3 text-base"
              placeholder="₪"
            />
          </label>
          <Button type="submit" variant="primary" className="max-md:w-full">
            אשר עסקה
          </Button>
        </form>
      ) : (
        <p className="t-body text-ink-2">נשאר בתור. ייכנס להצעת שילוב כשתהיה דחופה באותה חנות או מחוז.</p>
      )}
    </section>
  )
}
