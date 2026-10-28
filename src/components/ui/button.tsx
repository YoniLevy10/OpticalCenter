'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { phraseChunk } from '@/lib/i18n/phrases'
import { localizeChunks } from '@/components/i18n/tx'
import { useLocale } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

/**
 * The only button in MaintainOS.
 * `primary` is the sole place tenant colour may fill a control.
 * `critical` is a SIGNAL colour and never a tenant colour.
 */
const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary:
          'border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        critical:
          'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15',
        resolve:
          'bg-[var(--signal-resolved)] text-white shadow-sm hover:opacity-90',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3',
        md: 'h-9 px-4',
        /** Touch target for mobile and technician surfaces. */
        touch: 'h-11 px-4',
        block: 'h-11 w-full px-4',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const { locale } = useLocale()
    const Comp = asChild ? Slot : 'button'
    const label =
      typeof props['aria-label'] === 'string'
        ? phraseChunk(locale, props['aria-label'])
        : props['aria-label']
    const title =
      typeof props.title === 'string' ? phraseChunk(locale, props.title) : props.title
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
        aria-label={label}
        title={title}
      >
        {asChild ? children : localizeChunks(children, locale)}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
