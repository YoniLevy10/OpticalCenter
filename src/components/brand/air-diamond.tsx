import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Official diamond, tilted, sitting off the plaster. Drifts only on the login screen. */
export function AirDiamond({
  drift = false,
  className,
}: {
  drift?: boolean
  className?: string
}) {
  return (
    <Image
      src="/brand/oc-mark-transparent.png"
      alt=""
      width={320}
      height={320}
      aria-hidden
      priority={drift}
      className={cn('air-diamond', drift && 'air-diamond-drift', className)}
    />
  )
}
