import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  EmptyState,
  ErrorState,
  PageHeader,
  RowSkeleton,
  Skeleton,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'

const meta = {
  title: 'OQ/Primitives',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const PageHeaderDefault: Story = {
  render: () => (
    <PageHeader
      title="תור תקלות"
      meta="14 פתוחות"
      actions={<Button variant="primary">תקלה חדשה</Button>}
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="אין תקלות"
      description="התור ריק — אפשר לנוח לרגע"
      action={<Button variant="secondary">רענון</Button>}
    />
  ),
}

export const Error: Story = {
  render: () => (
    <ErrorState
      title="משהו השתבש"
      description="לא הצלחנו לטעון את התור"
      action={<Button variant="critical">נסה שוב</Button>}
    />
  ),
}

export const CriticalError: Story = {
  render: () => (
    <ErrorState
      title="חריגת הרשאות"
      description="אין גישה לנתונים האלה"
      action={<Button variant="secondary">חזרה</Button>}
    />
  ),
}

export const Loading: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <RowSkeleton rows={4} />
    </div>
  ),
}
