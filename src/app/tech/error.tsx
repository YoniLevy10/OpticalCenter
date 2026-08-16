'use client'

import { TechShell } from '@/components/layout/tech-shell'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/primitives'

export default function TechError({ reset }: { reset: () => void }) {
  return (
    <TechShell title="שגיאה" eyebrow="MaintainOS · טכנאי">
      <ErrorState
        title="לא ניתן לטעון"
        description="בדקו את החיבור לרשת ונסו שוב."
        action={
          <Button variant="primary" size="touch" onClick={reset}>
            ניסיון חוזר
          </Button>
        }
      />
    </TechShell>
  )
}
