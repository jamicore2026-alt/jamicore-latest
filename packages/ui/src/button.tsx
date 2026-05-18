import * as React from 'react'
import { cn } from './utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'disabled:pointer-events-none disabled:opacity-50',
          variant === 'default' && 'bg-brand-600 text-white hover:bg-brand-700',
          variant === 'outline' && 'border border-brand-200 bg-white hover:bg-brand-50 text-brand-900',
          variant === 'ghost' && 'hover:bg-brand-50 text-brand-900',
          size === 'default' && 'h-10 px-4 py-2 text-sm',
          size === 'sm' && 'h-8 px-3 text-xs',
          size === 'lg' && 'h-12 px-6 text-base',
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
