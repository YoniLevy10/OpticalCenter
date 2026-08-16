import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  MetaValue,
  PriorityText,
  SlaBlock,
  SlaValue,
  StatusLabel,
  priorityEdgeClass,
} from '@/components/ui/signal'
import type { SlaView } from '@/modules/tickets/sla-display'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/modules/tickets/constants'

const views: SlaView[] = [
  {
    tone: 'idle',
    short: '—',
    long: 'אין שעון פעיל',
    phase: 'none',
    dueAt: null,
    remainingMs: null,
  },
  {
    tone: 'neutral',
    short: '2ש׳',
    long: 'תגובה עד 16:00',
    phase: 'respond',
    dueAt: null,
    remainingMs: 2 * 3_600_000,
  },
  {
    tone: 'warning',
    short: '12ד׳',
    long: 'תגובה עד 12:05',
    phase: 'respond',
    dueAt: null,
    remainingMs: 12 * 60_000,
  },
  {
    tone: 'critical',
    short: 'באיחור 27ד׳',
    long: 'חריגת תגובה',
    phase: 'respond',
    dueAt: null,
    remainingMs: -27 * 60_000,
  },
  {
    tone: 'done',
    short: 'הושלם',
    long: 'נפתר בזמן',
    phase: 'none',
    dueAt: null,
    remainingMs: null,
  },
]

const meta = {
  title: 'OQ/Signal',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const StatusLabels: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {TICKET_STATUSES.map((status) => (
        <StatusLabel key={status} status={status} />
      ))}
    </div>
  ),
}

export const PriorityTexts: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {TICKET_PRIORITIES.map((priority) => (
        <PriorityText key={priority} priority={priority} />
      ))}
    </div>
  ),
}

export const SlaValues: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {views.map((view) => (
        <div key={view.tone} className="flex items-baseline gap-4">
          <SlaValue view={view} />
          <span className="t-caption text-ink-3">{view.tone}</span>
        </div>
      ))}
    </div>
  ),
}

export const SlaCriticalBlock: Story = {
  name: 'Critical SLA block',
  render: () => <SlaBlock view={views.find((v) => v.tone === 'critical')!} />,
}

export const PriorityEdges: Story = {
  render: () => (
    <div className="divide-y divide-border bg-surface">
      {TICKET_PRIORITIES.map((priority) => (
        <div
          key={priority}
          className={`px-4 py-3 ps-5 ${priorityEdgeClass(priority)}`}
        >
          <PriorityText priority={priority} />
        </div>
      ))}
    </div>
  ),
}

export const MetaLtr: Story = {
  name: 'Meta LTR inside RTL',
  render: () => (
    <p className="t-body text-ink">
      חנות <MetaValue ltr>AZRIELI-01</MetaValue> · טלפון{' '}
      <MetaValue ltr>03-555-1212</MetaValue>
    </p>
  ),
}
