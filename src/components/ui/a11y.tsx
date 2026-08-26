import { cn } from '@/lib/utils'

export function VisuallyHidden({
  children,
  className,
  as: Tag = 'span',
}: {
  children: React.ReactNode
  className?: string
  as?: 'span' | 'div' | 'p'
}) {
  return <Tag className={cn('sr-only', className)}>{children}</Tag>
}

export function LiveRegion({
  children,
  politeness = 'polite',
  role,
  className,
}: {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
  role?: 'status' | 'alert'
  className?: string
}) {
  return (
    <div
      role={role ?? (politeness === 'assertive' ? 'alert' : 'status')}
      aria-live={politeness}
      aria-atomic="true"
      className={className}
    >
      {children}
    </div>
  )
}
