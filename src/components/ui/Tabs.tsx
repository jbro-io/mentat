import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef } from "react";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const classes = [
    "flex border-b border-mentat-border bg-mentat-bg",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <TabsPrimitive.List ref={ref} className={classes} {...props} />;
});
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const classes = [
    "px-4 py-2 text-sm text-zinc-400 data-[state=active]:text-mentat-accent data-[state=active]:border-b-2 data-[state=active]:border-mentat-accent transition-colors hover:text-zinc-200 cursor-pointer outline-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <TabsPrimitive.Trigger ref={ref} className={classes} {...props} />;
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  const classes = ["flex-1 overflow-hidden", className]
    .filter(Boolean)
    .join(" ");

  return <TabsPrimitive.Content ref={ref} className={classes} {...props} />;
});
TabsContent.displayName = "TabsContent";
