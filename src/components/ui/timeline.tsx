import { format } from 'date-fns'
import { ArrowLeft, MessageSquare, Send, StickyNote, Activity } from 'lucide-react'
import type { ActivityItem } from '@/modules/tickets/activity'
import { EmptyState } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/**
 * One chronology. Messages and events were two separate cards, which forced the
 * operator to reconstruct order in their head. Operationally they are a single
 * story: what the store said, what the system did, what the technician found.
 */

function timeOf(iso: string): string {
  try {
    return format(new Date(iso), 'dd/MM · HH:mm')
  } catch {
    return '—'
  }
}

function iconFor(kind: ActivityItem['kind']) {
  switch (kind) {
    case 'message_in':
      return MessageSquare
    case 'message_out':
      return Send
    case 'note':
      return StickyNote
    default:
      return Activity
  }
}

export function Timeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="אין פעילות עדיין"
        description="הודעות מהחנות ופעולות הצוות יופיעו כאן."
      />
    )
  }

  return (
    <ol className="relative px-4 py-3">
      {/* Spine sits on the inline-start edge and mirrors under LTR. */}
      <span
        aria-hidden
        className="absolute inset-block-0 bottom-3 top-3 w-px bg-border start-[27px]"
      />
      {items.map((item) => {
        const Icon = iconFor(item.kind)
        const isInbound = item.kind === 'message_in'
        return (
          <li key={item.id} className="relative flex gap-3 py-2.5 ps-0">
            <span
              className={cn(
                'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                isInbound
                  ? 'border-border bg-surface text-ink'
                  : 'border-border bg-canvas text-ink-3',
              )}
            >
              <Icon className="h-3 w-3" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="t-body-strong text-ink">{item.label}</span>
                <span className="t-caption t-num text-ink-3">
                  {timeOf(item.at)}
                </span>
              </div>

              {item.transition?.to ? (
                <p className="t-body mt-0.5 flex items-center gap-1.5 text-ink-2">
                  {item.transition.from ? (
                    <>
                      <span>{item.transition.from}</span>
                      <ArrowLeft className="h-3 w-3 shrink-0 ltr:rotate-180" aria-hidden />
                    </>
                  ) : null}
                  <span className="text-ink">{item.transition.to}</span>
                </p>
              ) : null}

              {item.body ? (
                <p
                  className={cn(
                    't-body mt-1 whitespace-pre-wrap break-words',
                    isInbound ? 'text-ink' : 'text-ink-2',
                  )}
                >
                  {item.body}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
