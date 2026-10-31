import Link from 'next/link'

/** Screens that stay dense on a computer. The phone gets a short way back. */
export function PhoneDesktopOnly({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <>
      <div className="md:hidden">
        <p className="t-title text-ink">{title}</p>
        <p className="t-body mt-2 text-ink-2">המסך הזה נפתח במחשב.</p>
        <Link
          href="/ops/dashboard"
          className="t-body-strong mt-4 inline-flex min-h-12 items-center text-ink"
        >
          חזרה לבית
        </Link>
      </div>
      <div className="max-md:hidden">{children}</div>
    </>
  )
}
