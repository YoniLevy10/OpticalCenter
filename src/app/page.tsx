import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            MaintainOS
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Optical Center · פיילוט ישראל
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600">
            דיווח תקלות ב־WhatsApp (QR / NFC / קוד חנות), מרכז שליטה ל־HQ, ופורטל
            טכנאי נייד — בלי אפליקציה לעובדי חנות.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card href="/ops" title="לוח בקרה HQ" desc="KPI, תקלות, שיוך טכנאים" />
          <Card
            href="/ops/simulator"
            title="סימולטור WhatsApp"
            desc="דמו בלי Meta — STORE_172"
          />
          <Card href="/ops/stores" title="חנויות" desc="QR / NFC / קוד מספרי" />
          <Card href="/tech" title="פורטל טכנאי" desc="עבודות משויכות בנייד" />
          <Card href="/login" title="התחברות" desc="קישור קסם (Auth)" />
        </div>

        <p className="text-xs text-zinc-400">
          מקור אמת: Supabase · ערוץ דיווח: WhatsApp · מדיניות עלויות: inbound-first
        </p>
      </main>
    </div>
  )
}

function Card({
  href,
  title,
  desc,
}: {
  href: string
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow"
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-zinc-500">{desc}</div>
    </Link>
  )
}
