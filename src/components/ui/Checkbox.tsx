import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { forwardRef } from "react";

export const Checkbox = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  const classes = [
    "peer inline-flex items-center justify-center w-4 h-4 rounded border border-zinc-600 bg-mentat-bg-raised transition-colors focus:outline-none focus:ring-1 focus:ring-mentat-accent data-[state=checked]:bg-mentat-accent data-[state=checked]:border-mentat-accent",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <CheckboxPrimitive.Root ref={ref} className={classes} {...props}>
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="text-black"
        >
          <path
            d="M2 5L4 7L8 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

Checkbox.displayName = "Checkbox";
