import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { BottomSheet, Modal } from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'

const meta = {
  title: 'OQ/Overlay',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ModalDefault: Story = {
  render: function ModalStory() {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Button onClick={() => setOpen(true)}>פתח מודל</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="אישור פעולה"
          description="פעולה זו תשנה את סטטוס התקלה"
        >
          <p className="t-body text-ink-2">האם להמשיך?</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              אישור
            </Button>
          </div>
        </Modal>
      </>
    )
  },
}

export const ModalCritical: Story = {
  render: function ModalCriticalStory() {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Button variant="critical" onClick={() => setOpen(true)}>
          מחיקה
        </Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="מחיקת תקלה"
          description="לא ניתן לשחזר לאחר מחיקה"
        >
          <p className="t-body text-[var(--signal-critical)]">
            פעולה בלתי הפיכה.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button variant="critical" onClick={() => setOpen(false)}>
              מחק
            </Button>
          </div>
        </Modal>
      </>
    )
  },
}

export const BottomSheetDefault: Story = {
  render: function SheetStory() {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Button onClick={() => setOpen(true)}>פתח שיט</Button>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="פעולות"
          description="בחרו פעולה לתקלה"
        >
          <div className="flex flex-col gap-2">
            <Button size="block" variant="secondary">
              שינוי סטטוס
            </Button>
            <Button size="block" variant="secondary">
              שיוך טכנאי
            </Button>
            <Button size="block" variant="critical">
              סגירה כקריטי
            </Button>
          </div>
        </BottomSheet>
      </>
    )
  },
}

export const ClosedEmpty: Story = {
  name: 'Closed (empty trigger)',
  render: function ClosedStory() {
    const [open, setOpen] = useState(false)
    return (
      <div className="space-y-3">
        <p className="t-body text-ink-2">השכבה סגורה — רק טריגר.</p>
        <Button onClick={() => setOpen(true)}>פתח</Button>
        <BottomSheet open={open} onOpenChange={setOpen} title="ריק">
          <p className="t-body text-ink-2">אין תוכן נוסף</p>
        </BottomSheet>
      </div>
    )
  },
}
