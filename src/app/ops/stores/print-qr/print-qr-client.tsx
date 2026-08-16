'use client'

import { Button } from '@/components/ui/button'

export function PrintQrClient() {
  return (
    <Button type="button" variant="primary" size="sm" onClick={() => window.print()}>
      הדפסה / שמירה ל־PDF
    </Button>
  )
}
