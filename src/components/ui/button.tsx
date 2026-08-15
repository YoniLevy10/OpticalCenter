import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default:
          'border border-border bg-surface text-foreground hover:bg-canvas',
        primary: 'bg-accent text-white hover:bg-accent-hover',
        danger: 'bg-danger text-white hover:opacity-90',
        ghost: 'text-muted hover:bg-canvas hover:text-foreground',
      },
      size: {
        sm: 'h-8 px-2.5 md:h-8 max-md:min-h-[var(--touch-min)] max-md:px-3',
        md: 'h-9 px-3 max-md:min-h-[var(--touch-min)]',
        lg: 'min-h-[var(--touch-min)] px-4 text-[14px] w-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
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
