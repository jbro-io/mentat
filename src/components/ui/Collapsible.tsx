import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { forwardRef } from "react";

export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

export const CollapsibleContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, style, ...props }, ref) => {
  const classes = [
    "overflow-hidden data-[state=open]:animate-none data-[state=closed]:animate-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <CollapsiblePrimitive.Content
      ref={ref}
      className={classes}
      style={{
        ...style,
        transition: "height 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      {...props}
    />
  );
});

CollapsibleContent.displayName = "CollapsibleContent";
