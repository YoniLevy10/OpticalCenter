import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Field, Input, SearchField, Select, Textarea } from '@/components/ui/input'

const meta = {
  title: 'OQ/Input',
  component: Input,
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Field label="תיאור התקלה" htmlFor="desc">
      <Input id="desc" placeholder="מה נשבר?" />
    </Field>
  ),
}

export const Empty: Story = {
  render: () => (
    <Field label="חיפוש" htmlFor="q">
      <Input id="q" placeholder="מספר תקלה / חנות…" />
    </Field>
  ),
}

export const Error: Story = {
  render: () => (
    <Field label="טלפון" htmlFor="phone" hint="שדה חובה">
      <Input
        id="phone"
        aria-invalid
        defaultValue=""
        className="border-[var(--signal-critical-line)]"
        placeholder="05…"
      />
    </Field>
  ),
}

export const SearchEmpty: Story = {
  render: function SearchEmptyStory() {
    const [value, setValue] = useState('')
    return (
      <SearchField
        value={value}
        onValueChange={setValue}
        placeholder="חיפוש בתור…"
        autoFocusKey="/"
      />
    )
  },
}

export const SearchFilled: Story = {
  render: function SearchFilledStory() {
    const [value, setValue] = useState('OC-1042')
    return (
      <SearchField
        value={value}
        onValueChange={setValue}
        placeholder="חיפוש בתור…"
      />
    )
  },
}

export const SelectAndTextarea: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <Field label="עדיפות" htmlFor="pri">
        <Select id="pri" defaultValue="medium">
          <option value="critical">קריטי</option>
          <option value="high">גבוה</option>
          <option value="medium">בינוני</option>
          <option value="low">נמוך</option>
        </Select>
      </Field>
      <Field label="הערות" htmlFor="notes">
        <Textarea id="notes" placeholder="פירוט נוסף…" />
      </Field>
    </div>
  ),
}
