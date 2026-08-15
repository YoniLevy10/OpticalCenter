import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { Card, EmptyState } from '@/components/ui/primitives'

export default function ReportsPage() {
  return (
    <OpsShell
      pathname="/ops/reports"
      title="דוחות"
      subtitle="יופיעו כאן מדדי SLA וסיכומים כשיהיו מספיק נתונים"
    >
      <EmptyState
        title="עדיין אין דוחות"
        description="בפיילוט המיקוד הוא תיבת התקלות. דוחות יתווספו אחרי שימוש אמיתי."
      />
      <Card className="mt-4 p-4 text-[13px] text-muted">
        בינתיים:{' '}
        <Link href="/ops/tickets" className="text-accent hover:underline">
          תקלות
        </Link>{' '}
        ·{' '}
        <Link href="/ops" className="text-accent hover:underline">
          סקירה
        </Link>
      </Card>
    </OpsShell>
  )
}
