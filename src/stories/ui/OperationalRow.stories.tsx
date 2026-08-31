import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Dot, OperationalRow, RowList } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
import { RowSkeleton } from '@/components/ui/primitives'

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
    leading: '#172 · אבן גבירול',
    trailing: <span className="t-meta text-ink-3">פתוחה כבר 42 דקות</span>,
    title: 'מזגן לא מקרר באולם מכירות',
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
    leading: '#101 · רמת אביב',
    trailing: (
      <span className="t-meta text-[var(--signal-critical)]">חורגת</span>
    ),
    title: 'דלת חירום תקועה — אין יציאה',
    footer: (
      <>
        <StatusLabel status="waiting_parts" />
        <Dot />
        <span className="t-caption text-ink-3">לא משויך</span>
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
      <p className="t-body-strong text-ink">אין תקלות פתוחות 🎉</p>
      <p className="t-body mt-1 text-ink-2">הכל שקט כרגע</p>
    </div>
  ),
}

export const Queue: Story = {
  render: () => (
    <RowList>
      <OperationalRow
        href="#"
        priority="critical"
        leading="#101 · רמת אביב"
        trailing={
          <span className="t-meta text-[var(--signal-critical)]">חורגת</span>
        }
        title="דלת חירום תקועה"
        footer={<StatusLabel status="new" />}
      />
      <OperationalRow
        href="#"
        priority="high"
        leading="#172 · דיזנגוף"
        trailing={<span className="t-meta text-ink-3">פתוחה כבר שעתיים</span>}
        title="תאורת ויטרינה כבויה"
        footer={<StatusLabel status="assigned" />}
      />
      <OperationalRow
        href="#"
        priority="low"
        leading="#205 · עזריאלי"
        trailing={<span className="t-meta text-ink-3">פתוחה כבר יום</span>}
        title="בקשת תחזוקה שוטפת"
        footer={<StatusLabel status="triaged" />}
      />
    </RowList>
  ),
}
