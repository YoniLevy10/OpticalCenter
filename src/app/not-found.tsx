import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand/brand-mark'

export default function NotFound() {
  return (
    <div className="dvh-screen safe-pt flex items-center justify-center bg-canvas px-4">
      <div className="max-w-sm text-center">
        <div className="mb-4 flex justify-center">
          <BrandMark size={56} className="rounded-[var(--radius-lg)]" />
        </div>
        <p className="t-caption t-num text-ink-3">404</p>
        <h1 className="t-title mt-1 text-ink">הדף לא נמצא</h1>
        <p className="t-body mt-2 text-ink-2">
          ייתכן שהתקלה נמחקה או שהקישור אינו תקין.
        </p>
        <div className="mt-5">
          <Button asChild variant="primary">
            <Link href="/ops/tickets">חזרה לתקלות</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
