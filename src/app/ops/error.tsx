'use client'

import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/primitives'

export default function OpsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <AppShell>
      <div className="max-w-lg">
        <ErrorState
          title="לא ניתן לטעון את המסך"
          description={
            error.digest
              ? `אירעה שגיאה. מזהה: ${error.digest}`
              : 'אירעה שגיאה בטעינת הנתונים. נסו שוב.'
          }
          action={
            <Button variant="secondary" size="sm" onClick={reset}>
              ניסיון חוזר
            </Button>
          }
        />
      </div>
    </AppShell>
  )
}
