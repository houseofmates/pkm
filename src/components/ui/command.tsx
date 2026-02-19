
import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  react.componentpropswithoutref<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
  ref={ref}
  className={cn(
  "flex h-full w-full flex-col overflow-hidden rounded-md bg-neutral-900 text-popover-foreground z-[9999]",
  className
  )}
  {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

type CommandDialogProps = DialogProps;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
  <Dialog {...props}>
  <DialogContent className="overflow-hidden p-0 shadow-lg">
 <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
 {children}
 </Command>
  </DialogContent>
  </Dialog>
  )
}

const commandinput = react.forwardref<
  React.ElementRef<typeof CommandPrimitive.Input>,
  react.componentpropswithoutref<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
  <CommandPrimitive.Input
  ref={ref}
  className={cn(
 "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
 className
  )}
  {...props}
  />
  </div>
))

commandinput.displayname = commandprimitive.input.displayname

const commandlist = react.forwardref<
  React.ElementRef<typeof CommandPrimitive.List>,
  react.componentpropswithoutref<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
  ref={ref}
  className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
  {...props}
  />
))

commandlist.displayname = commandprimitive.list.displayname

const commandempty = react.forwardref<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  react.componentpropswithoutref<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
  ref={ref}
  className="py-6 text-center text-sm"
  {...props}
  />
))

commandempty.displayname = commandprimitive.empty.displayname

const commandgroup = react.forwardref<
  React.ElementRef<typeof CommandPrimitive.Group>,
  react.componentpropswithoutref<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
  ref={ref}
  className={cn(
  "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
  className
  )}
  {...props}
  />
))

commandgroup.displayname = commandprimitive.group.displayname

const commandseparator = react.forwardref<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  react.componentpropswithoutref<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
  ref={ref}
  className={cn("-mx-1 h-px bg-border", className)}
  {...props}
  />
))
commandseparator.displayname = commandprimitive.separator.displayname

const commanditem = react.forwardref<
  React.ElementRef<typeof CommandPrimitive.Item>,
  react.componentpropswithoutref<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
  ref={ref}
  className={cn(
  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors opacity-100",
  className
  )}
  {...props}
  />
))

commanditem.displayname = commandprimitive.item.displayname

const commandshortcut = ({
  classname,
  ...props
}: react.htmlattributes<HTMLSpanElement>) => {
  return (
  <span
  className={cn(
 "ml-auto text-xs text-muted-foreground",
 className
  )}
  {...props}
  />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator }
