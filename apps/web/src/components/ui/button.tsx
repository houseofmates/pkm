import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"

import { cn } from '../../../packages/core/src/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.memo(React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, variant = 'default', size = 'md', ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    // basic variant/size class logic
    const variantClass =
      variant === 'outline' ? 'border border-muted bg-transparent text-muted-foreground' :
      variant === 'destructive' ? 'bg-red-600 text-white' :
      variant === 'secondary' ? 'bg-muted text-muted-foreground' :
      variant === 'ghost' ? 'bg-transparent text-slate-400 hover:bg-slate-800' :
      'bg-emerald-500 text-white';
    const sizeClass =
      size === 'sm' ? 'px-2 py-1 text-xs' :
      size === 'lg' ? 'px-6 py-3 text-lg' :
      'px-4 py-2 text-sm';
    return (
      <Comp
        className={cn(variantClass, sizeClass, className)}
        ref={ref}
        {...props}
      />
    )
  }
))
Button.displayName = "Button"

export { Button }