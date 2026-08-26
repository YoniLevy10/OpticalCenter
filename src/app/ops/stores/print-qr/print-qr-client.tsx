'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function PrintQrClient() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="primary" size="sm" onClick={() => window.print()}>
        הדפסה / שמירה ל־PDF
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link href="/api/stores/qr-batch" target="_blank" rel="noopener">
          הורדת QR לכל החנויות
        </Link>
      </Button>
    </div>
  )
}
