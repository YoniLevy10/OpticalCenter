import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The only button in MaintainOS.
 * `primary` is the sole place tenant colour may fill a control.
 * `critical` is a SIGNAL colour and never a tenant colour.
 */
const buttonVariants = cva(
  't-control inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] transition-all duration-[var(--dur-1)] ease-[var(--ease)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--tenant)] text-[var(--tenant-contrast)] shadow-[var(--shadow-1)] hover:bg-[var(--tenant-hover)] hover:shadow-[var(--shadow-2)]',
        secondary:
          'border border-border bg-surface text-ink shadow-[var(--shadow-1)] hover:border-border-strong hover:bg-surface-sunken/50',
        ghost: 'text-ink-2 hover:bg-surface-sunken hover:text-ink',
        critical:
          'border border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)] text-[var(--signal-critical)] hover:bg-[color-mix(in_srgb,var(--signal-critical)_10%,white)]',
        resolve:
          'bg-[var(--signal-resolved)] text-white shadow-[var(--shadow-1)] hover:bg-[color-mix(in_srgb,var(--signal-resolved)_88%,black)] hover:shadow-[var(--shadow-2)]',
      },
      size: {
        sm: 'h-8 px-2.5',
        md: 'h-9 px-3.5',
        /** Touch target floor for mobile and technician surfaces. */
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
