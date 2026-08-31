'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Modal, BottomSheet } from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'
import { TicketReportForm } from '@/components/report/ticket-report-form'
import { useMediaQuery } from '@/hooks/use-media-query'

type StoreOpt = { code: string; name: string; id?: string }

/**
 * HQ create-ticket entry: toolbar / FAB / `?new=1`.
 * Mobile uses BottomSheet; desktop Modal.
 */
export function CreateTicketDialog({
  stores,
  trigger = 'none',
  fab = false,
}: {
  stores: StoreOpt[]
  /** Render a primary trigger button. */
  trigger?: 'none' | 'toolbar' | 'header'
  /** Fixed mobile FAB above bottom nav. */
  fab?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const clearNewParam = useCallback(() => {
    if (searchParams.get('new') !== '1') return
    const next = new URLSearchParams(searchParams.toString())
    next.delete('new')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (searchParams.get('new') === '1') setOpen(true)
  }, [searchParams])

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) clearNewParam()
  }

  function openDialog() {
    setOpen(true)
  }

  const form = (
    <TicketReportForm
      apiUrl="/api/tickets"
      initialStore=""
      stores={stores}
      showWhatsApp={false}
      mode="ops"
      onCreated={() => {
        router.refresh()
      }}
      onDismiss={() => onOpenChange(false)}
    />
  )

  const title = 'פתח תקלה'
  const description = 'בלי WhatsApp — פשוט ממלאים כאן'

  return (
    <>
      {trigger === 'toolbar' ? (
        <Button type="button" variant="primary" className="shrink-0" onClick={openDialog}>
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">פתח תקלה</span>
          <span className="sm:hidden">פתח</span>
        </Button>
      ) : null}

      {trigger === 'header' ? (
        <Button type="button" variant="primary" size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4" aria-hidden />
          פתח תקלה
        </Button>
      ) : null}

      {fab ? (
        <Button
          type="button"
          variant="primary"
          onClick={openDialog}
          aria-label="פתח תקלה"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] end-4 z-30 h-14 w-14 rounded-full p-0 shadow-[var(--shadow-pop)] md:hidden"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Button>
      ) : null}

      {mounted && isDesktop ? (
        <Modal
          open={open}
          onOpenChange={onOpenChange}
          title={title}
          description={description}
          className="w-[min(92vw,520px)] max-h-[90dvh] overflow-y-auto"
        >
          {open ? form : null}
        </Modal>
      ) : null}

      {mounted && !isDesktop ? (
        <BottomSheet
          open={open}
          onOpenChange={onOpenChange}
          title={title}
          description={description}
        >
          {open ? form : null}
        </BottomSheet>
      ) : null}
    </>
  )
}
