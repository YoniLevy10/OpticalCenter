import { Tx } from '@/components/i18n/tx'

/**
 * The three facts a decision needs: why, what it cost, whether it returned.
 * Type carries the distinction. None of the three is a colored badge.
 */
export function FactStrip({
  root,
  cost,
  repeat,
  note,
}: {
  root: string
  cost: string
  repeat: string
  note?: string | null
}) {
  return (
    <section aria-label="שורש, עלות וחזרה" className="overflow-hidden rounded-xl bg-border">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-3">
        <Fact label="שורש" value={root} />
        <Fact label="עלות" value={cost} />
        <Fact label="חזרה" value={repeat} />
      </div>
      {note ? (
        <p className="border-t bg-muted px-3 py-2 text-sm text-ink-2">
          <Tx text={note} />
        </p>
      ) : null}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">
        <Tx text={label} />
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
