import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { WhatsAppTemplatesClient } from './whatsapp-templates-client'

export default function WhatsAppTemplatesPage() {
  return (
    <div className="flex flex-col gap-4">
      <OpsPageHero
        title="תבניות WhatsApp"
        status="ניהול תבניות Meta לשליחה אחרי סגירת חלון 24 השעות"
      />
      <WhatsAppTemplatesClient />
    </div>
  )
}
