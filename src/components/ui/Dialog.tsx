import * as DialogPrimitive from "@radix-ui/react-dialog";
import { forwardRef } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const classes = [
    "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-[fadeIn_250ms_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[fadeOut_200ms_ease-in_both]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <DialogPrimitive.Overlay ref={ref} className={classes} {...props} />;
});

DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const classes = [
    "fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-[480px] bg-mentat-bg border border-mentat-border rounded-xl shadow-2xl data-[state=open]:animate-[scaleIn_300ms_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[scaleOut_200ms_ease-in_both]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content ref={ref} className={classes} {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

DialogContent.displayName = "DialogContent";

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = [
    "px-4 py-3 border-b border-mentat-border",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = [
    "flex justify-end gap-2 px-4 py-3 border-t border-mentat-border bg-mentat-bg/50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const classes = [
    "text-sm font-medium text-zinc-200",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <DialogPrimitive.Title ref={ref} className={classes} {...props} />;
});

DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  const classes = [
    "text-sm text-zinc-400",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DialogPrimitive.Description ref={ref} className={classes} {...props} />
  );
});

DialogDescription.displayName = "DialogDescription";
