"use client"

import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

const Separator = React.memo(React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  react.componentpropswithoutref<typeof SeparatorPrimitive.Root>
>(
  (
  { className, orientation = "horizontal", decorative = true, ...props },
  ref
  ) => {
  const mergedstyle = {
    ...((props as any).style || {}),
    ...(orientation === "horizontal" ? { height: 'var(--header-sep)' } : { width: 'var(--header-sep)' })
  }
  return (
  <SeparatorPrimitive.Root
  ref={ref}
  decorative={decorative}
  orientation={orientation}
  style={mergedStyle}
  className={cn(
 "shrink-0 bg-border",
 orientation === "horizontal" ? "w-full" : "h-full",
 className
 )}
  {...props}
  />
  )
  }
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
