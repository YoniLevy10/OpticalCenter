'use client'

import { useRouter } from 'next/navigation'
import { ActionMenu } from '@/components/ui/action-menu'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'

export function StoreSecondaryActions({
  code,
  storeId,
  isActive,
  canEdit,
}: {
  code: string
  storeId: string
  isActive: boolean
  canEdit: boolean
}) {
  const router = useRouter()

  async function toggleActive() {
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (!res.ok) return
      router.refresh()
    } catch {
      /* ignore — UI stays as-is */
    }
  }

  return (
    <ActionMenu
      label="פעולות נוספות לסניף"
      items={[
        {
          key: 'qr-print',
          label: 'הדפסת QR',
          href: '/ops/stores/print-qr',
        },
        {
          key: 'wa',
          label: 'פתיחת WhatsApp',
          href: storeWhatsAppDeepLink(code),
        },
        {
          key: 'tickets',
          label: 'תקלות בתור',
          href: `/ops/tickets?store=${encodeURIComponent(code)}`,
        },
        ...(canEdit
          ? [
              {
                key: 'edit',
                label: 'עריכה',
                href: `?tab=overview#store-edit`,
              },
              {
                key: 'toggle',
                label: isActive ? 'השבתת סניף' : 'הפעלת סניף',
                onSelect: () => void toggleActive(),
                tone: isActive ? ('critical' as const) : ('default' as const),
              },
            ]
          : []),
      ]}
    />
  )
}
