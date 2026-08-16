'use client'

import { Button } from '@/components/ui/button'

export function QrDownloadButtons({ code }: { code: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary" size="sm">
        <a href={`/api/stores/qr?code=${encodeURIComponent(code)}&format=svg`} download={`store-${code}-qr.svg`}>
          הורדת SVG
        </a>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <a href={`/api/stores/qr?code=${encodeURIComponent(code)}&format=png`} download={`store-${code}-qr.png`}>
          הורדת PNG
        </a>
      </Button>
    </div>
  )
}
