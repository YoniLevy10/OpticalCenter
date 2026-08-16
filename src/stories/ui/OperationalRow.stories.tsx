import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Dot, OperationalRow, RowList } from '@/components/ui/operational-row'
import { StatusLabel, SlaValue } from '@/components/ui/signal'
import { RowSkeleton } from '@/components/ui/primitives'
import type { SlaView } from '@/modules/tickets/sla-display'

const slaOk: SlaView = {
  tone: 'neutral',
  short: '42ד׳',
  long: 'תגובה עד 14:30',
  phase: 'respond',
  dueAt: null,
  remainingMs: 42 * 60_000,
}

const slaCritical: SlaView = {
  tone: 'critical',
  short: 'באיחור 27ד׳',
  long: 'חריגת תגובה',
  phase: 'respond',
  dueAt: null,
  remainingMs: -27 * 60_000,
}

const meta = {
  title: 'OQ/OperationalRow',
  component: OperationalRow,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof OperationalRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    href: '#',
    priority: 'medium',
    leading: 'OC-1042',
    trailing: <SlaValue view={slaOk} />,
    title: 'מזגן לא מקרר באולם מכירות',
    subtitle: 'סניף דיזנגוף',
    footer: (
      <>
        <StatusLabel status="in_progress" />
        <Dot />
        <span className="t-caption text-ink-3">יוסי כהן</span>
      </>
    ),
  },
}

export const Critical: Story = {
  args: {
    href: '#',
    priority: 'critical',
    leading: 'OC-1001',
    trailing: <SlaValue view={slaCritical} />,
    title: 'דלת חירום תקועה — אין יציאה',
    subtitle: 'סניף רמת אביב',
    footer: (
      <>
        <StatusLabel status="waiting_parts" />
        <Dot />
        <span className="t-caption text-ink-3">ללא בעלים</span>
      </>
    ),
  },
}

export const Loading: Story = {
  render: () => <RowSkeleton rows={5} />,
}

export const Empty: Story = {
  render: () => (
    <div className="bg-surface px-4 py-16 text-center">
      <p className="t-body-strong text-ink">אין תקלות בתור</p>
      <p className="t-body mt-1 text-ink-2">התור ריק כרגע</p>
    </div>
  ),
}

export const Queue: Story = {
  render: () => (
    <RowList>
      <OperationalRow
        href="#"
        priority="critical"
        leading="OC-1001"
        trailing={<SlaValue view={slaCritical} />}
        title="דלת חירום תקועה"
        subtitle="רמת אביב"
        footer={<StatusLabel status="new" />}
      />
      <OperationalRow
        href="#"
        priority="high"
        leading="OC-1033"
        trailing={<SlaValue view={slaOk} />}
        title="תאורת ויטרינה כבויה"
        subtitle="דיזנגוף"
        footer={<StatusLabel status="assigned" />}
      />
      <OperationalRow
        href="#"
        priority="low"
        leading="OC-1099"
        trailing={<SlaValue view={{ ...slaOk, tone: 'idle', short: '—' }} />}
        title="בקשת תחזוקה שוטפת"
        subtitle="עזריאלי"
        footer={<StatusLabel status="triaged" />}
      />
    </RowList>
  ),
}
