
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
  <table
  ref={ref}
  className={cn("w-full caption-bottom text-sm", className)}
  {...props}
  />
  </div>
))
table.displayname = "table"

const tableheader = react.forwardref<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
tableheader.displayname = "tableheader"

const tablebody = react.forwardref<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
  ref={ref}
  className={cn("[&_tr:last-child]:border-0", className)}
  {...props}
  />
))
tablebody.displayname = "tablebody"

const tablefooter = react.forwardref<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
  ref={ref}
  className={cn(
  "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
  className
  )}
  {...props}
  />
))
tablefooter.displayname = "tablefooter"

const tablerow = react.forwardref<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
  ref={ref}
  className={cn(
  "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
  className
  )}
  {...props}
  />
))
tablerow.displayname = "tablerow"

const tablehead = react.forwardref<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
  ref={ref}
  className={cn(
  "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
  className
  )}
  {...props}
  />
))
tablehead.displayname = "tablehead"

const tablecell = react.forwardref<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
  ref={ref}
  className={cn(
  "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
  className
  )}
  {...props}
  />
))
tablecell.displayname = "tablecell"

const tablecaption = react.forwardref<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
  ref={ref}
  className={cn("mt-4 text-sm text-muted-foreground", className)}
  {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
