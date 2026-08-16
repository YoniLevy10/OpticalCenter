import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

/**
 * Toast requires `ToastProvider`. Without it, `useToast().push` is a no-op.
 */
function ToastDemo() {
  const { push } = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => push({ title: 'נשמר', tone: 'neutral' })}
      >
        ניטרלי
      </Button>
      <Button
        variant="resolve"
        onClick={() => push({ title: 'התקלה נפתרה', tone: 'success' })}
      >
        הצלחה
      </Button>
      <Button
        variant="critical"
        onClick={() => push({ title: 'שמירה נכשלה', tone: 'critical' })}
      >
        קריטי
      </Button>
    </div>
  )
}

const meta = {
  title: 'OQ/Toast',
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Requires `ToastProvider` around the tree. Outside the provider, `useToast().push` is a silent no-op.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: () => <ToastDemo />,
}

export const Critical: Story = {
  render: function CriticalToast() {
    const { push } = useToast()
    return (
      <Button
        variant="critical"
        onClick={() => push({ title: 'חריגת SLA קריטית', tone: 'critical' })}
      >
        הצג התראת קריטי
      </Button>
    )
  },
}

export const WithoutProvider: Story = {
  name: 'Without provider (no-op)',
  decorators: [],
  render: () => {
    const Demo = () => {
      const { push } = useToast()
      return (
        <div className="space-y-2">
          <p className="t-body text-ink-2">
            ללא Provider הלחיצה לא מציגה דבר — זה מתועד בכוונה.
          </p>
          <Button onClick={() => push({ title: 'לא יופיע', tone: 'critical' })}>
            ניסיון ללא Provider
          </Button>
        </div>
      )
    }
    return <Demo />
  },
}
