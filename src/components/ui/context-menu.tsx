
import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const ContextMenu = ContextMenuPrimitive.Root

const ContextMenuTrigger = ContextMenuPrimitive.Trigger

const ContextMenuGroup = ContextMenuPrimitive.Group

const ContextMenuPortal = ContextMenuPrimitive.Portal

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
  ref={ref}
  className={cn(
  "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-primary focus:text-primary-foreground data-[state=open]:bg-primary data-[state=open]:text-primary-foreground",
  inset && "pl-8",
  className
  )}
  {...props}
  >
  {children}
  <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
))
contextmenusubtrigger.displayname = contextmenuprimitive.subtrigger.displayname

const contextmenusubcontent = react.forwardref<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
  ref={ref}
  className={cn(
  "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-[#050505] p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  className
  )}
  {...props}
  />
))
contextmenusubcontent.displayname = contextmenuprimitive.subcontent.displayname

const contextmenucontent = react.forwardref<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
  <ContextMenuPrimitive.Content
  ref={ref}
  className={cn(
 "z-50 min-w-[8rem] overflow-hidden rounded-md border shadow-lg animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
 className
  )}
  style={{ backgroundColor: '#050505', color: '#ffffff', padding: '0.25rem' }}
  {...props}
  />
  </ContextMenuPrimitive.Portal>
))
contextmenucontent.displayname = contextmenuprimitive.content.displayname

const contextmenuitem = react.forwardref<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
  ref={ref}
  className={cn(
  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-primary focus:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  inset && "pl-8",
  className
  )}
  {...props}
  />
))
contextmenuitem.displayname = contextmenuprimitive.item.displayname

const contextmenucheckboxitem = react.forwardref<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
  ref={ref}
  className={cn(
  "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  className
  )}
  checked={checked}
  {...props}
  >
  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
  <ContextMenuPrimitive.ItemIndicator>
 <Check className="h-4 w-4" />
  </ContextMenuPrimitive.ItemIndicator>
  </span>
  {children}
  </ContextMenuPrimitive.CheckboxItem>
))
contextmenucheckboxitem.displayname =
  contextmenuprimitive.checkboxitem.displayname

const contextmenuradioitem = react.forwardref<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
  ref={ref}
  className={cn(
  "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  className
  )}
  {...props}
  >
  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
  <ContextMenuPrimitive.ItemIndicator>
 <Circle className="h-2 w-2 fill-current" />
  </ContextMenuPrimitive.ItemIndicator>
  </span>
  {children}
  </ContextMenuPrimitive.RadioItem>
))
contextmenuradioitem.displayname = contextmenuprimitive.radioitem.displayname

const contextmenulabel = react.forwardref<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
  ref={ref}
  className={cn(
  "px-2 py-1.5 text-sm font-semibold text-foreground",
  inset && "pl-8",
  className
  )}
  {...props}
  />
))
contextmenulabel.displayname = contextmenuprimitive.label.displayname

const contextmenuseparator = react.forwardref<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  react.componentpropswithoutref<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
  ref={ref}
  className={cn("-mx-1 my-1 h-px bg-border", className)}
  {...props}
  />
))
contextmenuseparator.displayname = contextmenuprimitive.separator.displayname

const contextmenushortcut = ({
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
ContextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
