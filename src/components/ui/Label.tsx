import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef } from "react";

const baseClasses = "text-xs text-zinc-500 mb-1 block";

export const Label = forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const classes = [baseClasses, className].filter(Boolean).join(" ");
  return <LabelPrimitive.Root ref={ref} className={classes} {...props} />;
});

Label.displayName = "Label";
