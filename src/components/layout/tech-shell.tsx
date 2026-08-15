import Link from 'next/link'

export function TechShell({
  children,
  title,
  subtitle,
  techId,
  backHref,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  techId?: string | null
  backHref?: string
}) {
  const listHref = techId ? `/tech?techId=${encodeURIComponent(techId)}` : '/tech'

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {backHref ? (
            <Link
              href={backHref}
              className="rounded-md px-2 py-1 text-sm text-sky-700 hover:bg-sky-50"
            >
              חזרה
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              MaintainOS · טכנאי
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          <Link
            href={listHref}
            className="flex-1 py-3.5 text-center text-sm font-medium text-sky-800"
          >
            עבודות
          </Link>
          <Link href="/ops/tickets" className="flex-1 py-3.5 text-center text-sm text-zinc-500">
            HQ
          </Link>
        </div>
      </nav>
    </div>
  )
}

export function techHref(path: string, techId?: string | null) {
  if (!techId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}techId=${encodeURIComponent(techId)}`
}
