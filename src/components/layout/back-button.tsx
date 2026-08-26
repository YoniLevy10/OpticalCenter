import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/ui/a11y'

export function BackButton({
  href,
  label = 'חזרה',
  className,
}: {
  href: string
  label?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        '-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-colors duration-[var(--dur-1)] hover:bg-surface-sunken/60',
        className,
      )}
    >
      <ChevronRight className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" aria-hidden />
      <VisuallyHidden>{label}</VisuallyHidden>
    </Link>
  )
}
