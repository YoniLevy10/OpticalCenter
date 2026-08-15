import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-accent text-[11px] font-semibold text-white">
              OC
            </span>
            <p className="text-[12px] font-medium text-muted">MaintainOS</p>
          </div>
          <h1 className="mt-4 text-[28px] font-semibold tracking-tight">
            Optical Center · ישראל
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
            כלי תפעול שקט לדיווח תקלות, שיוך ותיקון — בלי רעש ויזואלי. WhatsApp
            לחנויות, HQ לדסקטופ, PWA לטכנאים.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: '/ops', title: 'סקירה HQ', desc: 'KPI ותשומת לב' },
            { href: '/ops/tickets', title: 'תקלות', desc: 'תיבת תפעול צפופה' },
            { href: '/ops/stores', title: 'חנויות', desc: 'QR / NFC / קוד' },
            { href: '/tech', title: 'פורטל טכנאי', desc: 'מובייל · PWA' },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:bg-canvas"
            >
              <div className="text-[14px] font-medium">{c.title}</div>
              <div className="mt-1 text-[13px] text-muted">{c.desc}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
