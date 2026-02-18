
// input
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const input = react.forwardref<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
  return (
  <input
 type={type}
 className={cn(
 "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
 className
 )}
 ref={ref}
 {...props}
  />
  )
  }
)
input.displayname = "input"

export { input }

// label
import * as labelprimitive from "@radix-ui/react-label"
import { cva, type variantprops } from "class-variance-authority"

const labelvariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const label = react.forwardref<
  React.ElementRef<typeof LabelPrimitive.Root>,
  react.componentpropswithoutref<typeof LabelPrimitive.Root> &
  variantprops<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
  ref={ref}
  className={cn(labelVariants(), className)}
  {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
