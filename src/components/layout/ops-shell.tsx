import Link from 'next/link'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/ops', label: 'לוח בקרה' },
  { href: '/ops/tickets', label: 'תקלות' },
  { href: '/ops/stores', label: 'חנויות' },
  { href: '/ops/simulator', label: 'סימולטור' },
  { href: '/tech', label: 'פורטל טכנאי' },
]

export function OpsShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/ops" className="text-sm font-semibold tracking-tight">
              MaintainOS
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-xs text-zinc-500">Optical Center · ישראל</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-200 bg-white sm:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 py-3 text-center text-xs text-zinc-600',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
