
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  react.componentpropswithoutref<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
  ref={ref}
  className={cn(
  "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
  className
  )}
  {...props}
  />
))
tabslist.displayname = tabsprimitive.list.displayname

const tabstrigger = react.forwardref<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  react.componentpropswithoutref<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
  ref={ref}
  className={cn(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  className
  )}
  {...props}
  />
))
tabstrigger.displayname = tabsprimitive.trigger.displayname

const tabscontent = react.forwardref<
  React.ElementRef<typeof TabsPrimitive.Content>,
  react.componentpropswithoutref<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
  ref={ref}
  className={cn(
  "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  className
  )}
  {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
