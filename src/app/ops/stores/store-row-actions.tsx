'use client'

import Link from 'next/link'
import { Eye, Pencil, QrCode } from 'lucide-react'
import { ActionMenu } from '@/components/ui/action-menu'
import { cn } from '@/lib/utils'

export function StoreRowActions({
  code,
  canEdit,
  className,
}: {
  code: string
  canEdit?: boolean
  className?: string
}) {
  const detail = `/ops/stores/${encodeURIComponent(code)}`
  const qr = `${detail}?tab=overview#store-qr`

  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      <Link
        href={detail}
        aria-label={`צפייה בסניף ${code}`}
        title="צפייה"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <Eye className="h-4 w-4" aria-hidden />
      </Link>
      {canEdit ? (
        <Link
          href={`${detail}?tab=overview#store-edit`}
          aria-label={`עריכת סניף ${code}`}
          title="עריכה"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
      <Link
        href={qr}
        aria-label={`QR לסניף ${code}`}
        title="QR"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <QrCode className="h-4 w-4" aria-hidden />
      </Link>
      <ActionMenu
        label={`עוד פעולות לסניף ${code}`}
        items={[
          { key: 'view', label: 'כרטיס סניף', href: detail },
          {
            key: 'tickets',
            label: 'תקלות פתוחות',
            href: `/ops/tickets?store=${encodeURIComponent(code)}`,
          },
          { key: 'qr', label: 'הדפסת QR', href: qr },
        ]}
      />
    </div>
  )
}
