import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'

const meta = {
  title: 'OQ/Button',
  component: Button,
  args: {
    children: 'שמירה',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'critical', 'resolve'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'touch', 'block'],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">ראשי</Button>
      <Button variant="secondary">משני</Button>
      <Button variant="ghost">שקוף</Button>
      <Button variant="critical">קריטי</Button>
      <Button variant="resolve">סגירה</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Button size="sm">קטן</Button>
      <Button size="md">בינוני</Button>
      <Button size="touch">מגע</Button>
      <Button size="block">מלא</Button>
    </div>
  ),
}

export const Critical: Story = {
  args: {
    variant: 'critical',
    children: 'מחיקה',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'לא זמין',
  },
}

export const LoadingProxy: Story = {
  name: 'Loading (disabled)',
  args: {
    disabled: true,
    children: 'שומר…',
    variant: 'primary',
  },
}
