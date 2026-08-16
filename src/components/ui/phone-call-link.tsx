import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Dial CTA — uses tel: for mobile PWA / HQ desk phones. */
export function PhoneCallLink({
  phone,
  label = 'חיוג',
  className,
}: {
  phone: string
  label?: string
  className?: string
}) {
  const digits = phone.replace(/[^\d+]/g, '')
  if (!digits) return null
  const href = digits.startsWith('+') ? `tel:${digits}` : `tel:+${digits}`

  return (
    <a
      href={href}
      dir="ltr"
      className={cn(
        't-control inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink transition-colors hover:bg-surface-sunken',
        className,
      )}
    >
      <Phone className="h-3.5 w-3.5 text-[var(--tenant)]" aria-hidden />
      <span className="t-num">{label === 'חיוג' ? phone : label}</span>
    </a>
  )
}
