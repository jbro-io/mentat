import * as SelectPrimitive from "@radix-ui/react-select";
import { forwardRef } from "react";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const classes = [
    "inline-flex items-center justify-between gap-2 bg-mentat-bg-raised border border-mentat-border rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent transition-colors",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SelectPrimitive.Trigger ref={ref} className={classes} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="text-zinc-400"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const classes = [
    "bg-mentat-bg border border-mentat-border rounded-lg shadow-xl overflow-hidden z-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content ref={ref} className={classes} position="popper" sideOffset={4} {...props}>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const classes = [
    "px-3 py-1.5 text-sm text-zinc-300 cursor-pointer outline-none data-[highlighted]:bg-mentat-bg-raised data-[highlighted]:text-zinc-100",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SelectPrimitive.Item ref={ref} className={classes} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});

SelectItem.displayName = "SelectItem";
