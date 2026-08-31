import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Optical Center official brand mark (red diamond + OC glasses).
 * Bamakor pattern: one fallback mark path reused in shell / login / splash / offline.
 */
const MARK_BLACK = '/brand/oc-mark.png'
const MARK_CLEAR = '/brand/oc-mark-transparent.png'

export type BrandMarkSize = 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 80 | 88 | 112

const SIZE_CLASS: Record<BrandMarkSize, string> = {
  28: 'h-7 w-7',
  32: 'h-8 w-8',
  36: 'h-9 w-9',
  40: 'h-10 w-10',
  48: 'h-12 w-12',
  56: 'h-14 w-14',
  64: 'h-16 w-16',
  72: 'h-[4.5rem] w-[4.5rem]',
  80: 'h-20 w-20',
  88: 'h-[5.5rem] w-[5.5rem]',
  112: 'h-28 w-28',
}

export function BrandMark({
  size = 32,
  variant = 'black',
  className,
  priority,
  alt = 'Optical Center',
}: {
  size?: BrandMarkSize
  /** `black` = official square on black (PWA/dark). `clear` = diamond only for light chips. */
  variant?: 'black' | 'clear'
  className?: string
  priority?: boolean
  alt?: string
}) {
  const src = variant === 'clear' ? MARK_CLEAR : MARK_BLACK
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn(
        SIZE_CLASS[size],
        'shrink-0 rounded-[var(--radius-md)] object-cover shadow-[var(--shadow-1)]',
        className,
      )}
    />
  )
}

/** Full stacked wordmark (icon + OPTICAL CENTER + ראייה & שמיעה) for splash/login hero. */
export function BrandLogoFull({
  className,
  priority,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/brand/oc-logo-full.png"
      alt="Optical Center — ראייה ושמיעה"
      width={220}
      height={220}
      priority={priority}
      className={cn('h-auto w-[140px] object-contain md:w-[180px]', className)}
    />
  )
}

/** Lightweight loading splash — Bamakor AppSplashScreen pattern. */
export function BrandSplash({ label = 'MaintainOS' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12">
      <BrandMark size={80} priority className="rounded-[var(--radius-lg)] shadow-[var(--shadow-2)]" />
      <p className="t-caption text-ink-3">{label}</p>
      <span
        aria-hidden
        className="h-1 w-16 overflow-hidden rounded-full bg-surface-sunken"
      >
        <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--tenant)]" />
      </span>
    </div>
  )
}
