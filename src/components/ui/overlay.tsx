'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const overlayClass =
  'fixed inset-0 z-40 animate-fade bg-[rgba(18,18,22,0.35)] backdrop-blur-[2px]'

function CloseButton() {
  return (
    <Dialog.Close
      aria-label="סגירה"
      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
    >
      <X className="h-4 w-4" />
    </Dialog.Close>
  )
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className={cn(
            'fixed start-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 animate-scale-in rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-pop)] rtl:translate-x-1/2',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <Dialog.Title className="t-section text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="t-meta mt-0.5 text-ink-2">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <CloseButton />
          </div>
          <div className="p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Mobile bottom sheet. Respects the home indicator and caps at 88dvh so the
 * sheet never fights the keyboard.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] animate-slide-up flex-col rounded-t-[var(--radius-xl)] border-t border-border bg-surface shadow-[var(--shadow-pop)]"
          style={{ paddingBottom: 'var(--safe-b)' }}
        >
          <div className="flex justify-center pt-2" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-border-strong" />
          </div>
          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-2">
            <div>
              <Dialog.Title className="t-section text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="t-meta mt-0.5 text-ink-2">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <CloseButton />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
