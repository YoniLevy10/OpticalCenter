'use client'

import { Button } from '@/components/ui/button'

export function PrintQrClient() {
  return (
    <Button type="button" variant="primary" size="touch" className="md:h-9 md:min-h-0 md:px-4" onClick={() => window.print()}>
      הדפסה / שמירה ל־PDF
    </Button>
  )
}
