'use client'

import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { whatsAppShareUrl } from '@/modules/stores/whatsapp-link'
import { cn } from '@/lib/utils'

type Props = {
  prefillText: string
  label?: string
  className?: string
  size?: 'sm' | 'default'
  variant?: 'primary' | 'secondary'
}

/** Opens wa.me with pre-filled text; Web Share API on mobile when available. */
export function WhatsAppShareButton({
  prefillText,
  label = 'שיתוף ב-WhatsApp',
  className,
  size = 'default',
  variant = 'secondary',
}: Props) {
  const url = whatsAppShareUrl(prefillText)

  async function onClick() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'MaintainOS', text: prefillText, url })
        return
      } catch {
        /* user cancelled or unsupported payload */
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size === 'sm' ? 'sm' : undefined}
      className={cn(className)}
      onClick={() => void onClick()}
    >
      <Share2 className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  )
}
