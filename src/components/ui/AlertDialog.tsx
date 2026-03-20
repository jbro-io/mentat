import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { forwardRef } from "react";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogOverlay = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const classes = [
    "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-[fadeIn_250ms_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[fadeOut_200ms_ease-in_both]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AlertDialogPrimitive.Overlay ref={ref} className={classes} {...props} />
  );
});

AlertDialogOverlay.displayName = "AlertDialogOverlay";

export const AlertDialogContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const classes = [
    "fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-[480px] bg-mentat-bg border border-mentat-border rounded-xl shadow-2xl data-[state=open]:animate-[scaleIn_300ms_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[scaleOut_200ms_ease-in_both]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
});

AlertDialogContent.displayName = "AlertDialogContent";

export const AlertDialogTitle = forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const classes = ["text-sm font-medium text-zinc-200", className]
    .filter(Boolean)
    .join(" ");

  return (
    <AlertDialogPrimitive.Title ref={ref} className={classes} {...props} />
  );
});

AlertDialogTitle.displayName = "AlertDialogTitle";

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  const classes = ["text-sm text-zinc-400", className]
    .filter(Boolean)
    .join(" ");

  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={classes}
      {...props}
    />
  );
});

AlertDialogDescription.displayName = "AlertDialogDescription";

export const AlertDialogCancel = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => {
  const classes = [
    "text-xs px-3 py-1.5 rounded bg-mentat-bg-raised text-zinc-300 border border-mentat-border hover:bg-mentat-bg-surface hover:text-zinc-200 transition-colors",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AlertDialogPrimitive.Cancel ref={ref} className={classes} {...props} />
  );
});

AlertDialogCancel.displayName = "AlertDialogCancel";

export const AlertDialogAction = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => {
  const classes = [
    "text-xs px-3 py-1.5 rounded bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AlertDialogPrimitive.Action ref={ref} className={classes} {...props} />
  );
});

AlertDialogAction.displayName = "AlertDialogAction";
