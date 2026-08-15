import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'

export default function TechPortalPage() {
  return (
    <OpsShell
      title="פורטל טכנאי"
      subtitle="שלב הבא: עבודות משויכות, עדכון סטטוס, תמונות וסגירה"
    >
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-10 text-center">
        <p className="text-sm text-zinc-600">
          כאן יופיעו תקלות שמשויכות לצוות התחזוקה של Optical Center בישראל.
        </p>
        <Link
          href="/ops/tickets"
          className="mt-4 inline-block text-sm text-sky-700 hover:underline"
        >
          חזרה לתקלות
        </Link>
      </div>
    </OpsShell>
  )
}
