import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Optical Clean V2 — three button types.
 * `primary` is the sole place tenant wine may fill a control.
 * `critical` / `resolve` are signal exceptions only.
 */
const buttonVariants = cva(
  't-control inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] transition-[background-color,border-color,color,opacity] duration-[var(--dur-1)] ease-[var(--ease)] active:opacity-90 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--tenant)] text-[var(--tenant-contrast)] hover:bg-[var(--tenant-hover)]',
        secondary:
          'border border-border bg-surface text-ink hover:bg-surface-sunken',
        ghost: 'text-ink-2 hover:bg-surface-sunken hover:text-ink',
        critical:
          'border border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)] text-[var(--signal-critical)] hover:bg-[color-mix(in_srgb,var(--signal-critical)_10%,white)]',
        resolve:
          'bg-[var(--signal-resolved)] text-white hover:bg-[color-mix(in_srgb,var(--signal-resolved)_88%,black)]',
      },
      size: {
        sm: 'h-8 px-2.5',
        md: 'h-9 px-3.5',
        touch: 'h-11 px-4 t-control-lg',
        block: 'h-12 w-full px-4 t-control-lg',
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
