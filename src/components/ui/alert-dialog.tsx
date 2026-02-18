
"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  react.componentpropswithoutref<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
  className={cn(
  "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  className
  )}
  {...props}
  ref={ref}
  />
))
alertdialogoverlay.displayname = alertdialogprimitive.overlay.displayname

const alertdialogcontent = react.forwardref<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  react.componentpropswithoutref<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
  <AlertDialogOverlay />
  <AlertDialogPrimitive.Content
  ref={ref}
  className={cn(
 "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
 className
  )}
  {...props}
  />
  </AlertDialogPortal>
))
alertdialogcontent.displayname = alertdialogprimitive.content.displayname

const alertdialogheader = ({
  classname,
  ...props
}: react.htmlattributes<HTMLDivElement>) => (
  <div
  className={cn(
  "flex flex-col space-y-2 text-center sm:text-left",
  className
  )}
  {...props}
  />
)
alertdialogheader.displayname = "alertdialogheader"

const alertdialogfooter = ({
  classname,
  ...props
}: react.htmlattributes<HTMLDivElement>) => (
  <div
  className={cn(
  "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
  className
  )}
  {...props}
  />
)
alertdialogfooter.displayname = "alertdialogfooter"

const alertdialogtitle = react.forwardref<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  react.componentpropswithoutref<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
  ref={ref}
  className={cn("text-lg font-semibold", className)}
  {...props}
  />
))
alertdialogtitle.displayname = alertdialogprimitive.title.displayname

const alertdialogdescription = react.forwardref<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  react.componentpropswithoutref<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
  ref={ref}
  className={cn("text-sm text-muted-foreground", className)}
  {...props}
  />
))
alertdialogdescription.displayname =
  alertdialogprimitive.description.displayname

const alertdialogaction = react.forwardref<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  react.componentpropswithoutref<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
  ref={ref}
  className={cn(buttonVariants(), className)}
  {...props}
  />
))
alertdialogaction.displayname = alertdialogprimitive.action.displayname

const alertdialogcancel = react.forwardref<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  react.componentpropswithoutref<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
  ref={ref}
  className={cn(
  buttonVariants({ variant: "outline" }),
  "mt-2 sm:mt-0",
  className
  )}
  {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
