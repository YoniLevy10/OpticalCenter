'use client'

import { WhatsAppShareButton } from '@/components/ui/whatsapp-share-button'

export function TicketShareBar({
  display,
  storeCode,
  storeName,
  description,
  techName,
}: {
  display: string
  storeCode?: string
  storeName?: string
  description: string
  techName?: string | null
}) {
  const lines = [
    `MaintainOS · ${display}`,
    storeName && storeCode ? `${storeName} (#${storeCode})` : null,
    description.slice(0, 200),
    techName ? `טכנאי: ${techName}` : 'לא משויך',
    typeof window !== 'undefined' ? `${window.location.origin}/tech` : '/tech',
  ].filter(Boolean)

  return (
    <WhatsAppShareButton
      prefillText={lines.join('\n')}
      label="שתף לטכנאי"
      variant="secondary"
      size="sm"
    />
  )
}
