import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { WhatsAppTemplatesClient } from './whatsapp-templates-client'
import { PhoneDesktopOnly } from '@/components/layout/phone-desktop-only'

export default function WhatsAppTemplatesPage() {
  return (
    <PhoneDesktopOnly title="תבניות WhatsApp">
    <div className="flex flex-col gap-4">
      <OpsPageHero
        title="תבניות WhatsApp"
        status="ניהול תבניות Meta לשליחה אחרי סגירת חלון 24 השעות"
      />
      <WhatsAppTemplatesClient />
    </div>
    </PhoneDesktopOnly>
  )
}
