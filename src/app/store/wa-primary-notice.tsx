import Link from 'next/link'
import { Notice } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'

/**
 * Store managers report and confirm primarily via WhatsApp.
 * Web /store/report is a secondary fallback only.
 */
export async function StoreWaPrimaryNotice({
  storeCode,
  mode,
}: {
  storeCode: string
  mode: 'home' | 'report' | 'confirm'
}) {
  const phone = await resolveWhatsAppBusinessPhone()
  const waHref = storeWhatsAppDeepLink(storeCode, phone)

  if (mode === 'confirm') {
    return (
      <Notice tone="progress">
        אישור תיקון נעשה בוואטסאפ (כפתור «אשר תיקון» או תשובה «מאשר»). העמוד
        הזה הוא גיבוי בלבד.
      </Notice>
    )
  }

  return (
    <div className="space-y-3">
      <Notice tone="progress">
        {mode === 'report'
          ? 'הדיווח העיקרי הוא בוואטסאפ — סרקו את ה־QR בחנות או לחצו למטה. הטופס כאן הוא גיבוי.'
          : 'דיווח ואישור תיקון — דרך WhatsApp. הפורטל הוא גיבוי למעקב בלבד.'}
      </Notice>
      <Button asChild variant="primary" size="block">
        <a href={waHref} target="_blank" rel="noopener noreferrer">
          פתיחת WhatsApp לדיווח
        </a>
      </Button>
      {mode === 'home' ? (
        <p className="t-caption text-ink-3">
          גיבוי:{' '}
          <Link href="/store/report" className="underline">
            טופס דיווח באתר
          </Link>
        </p>
      ) : null}
    </div>
  )
}
