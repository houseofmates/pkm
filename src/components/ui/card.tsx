
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
  ref={ref}
  className={cn(
  "rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden isolate relative",
  className
  )}
  {...props}
  />
)))
card.displayname = "card"

const cardheader = react.memo(react.forwardref<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
  ref={ref}
  className={cn("flex flex-col space-y-1.5 p-6", className)}
  {...props}
  />
)))
cardheader.displayname = "cardheader"

const cardtitle = react.memo(react.forwardref<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
  ref={ref}
  className={cn(
  "text-2xl font-semibold leading-none ",
  className
  )}
  {...props}
  />
)))
cardtitle.displayname = "cardtitle"

const carddescription = react.memo(react.forwardref<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
  ref={ref}
  className={cn("text-sm text-muted-foreground", className)}
  {...props}
  />
)))
carddescription.displayname = "carddescription"

const cardcontent = react.memo(react.forwardref<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
)))
cardcontent.displayname = "cardcontent"

const cardfooter = react.memo(react.forwardref<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
  ref={ref}
  className={cn("flex items-center p-6 pt-0", className)}
  {...props}
  />
)))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
