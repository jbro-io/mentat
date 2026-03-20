import { forwardRef } from "react";

const baseClasses =
  "w-full bg-mentat-bg-raised border border-mentat-border rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-mentat-accent focus:ring-1 focus:ring-mentat-accent transition-colors";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const classes = [baseClasses, className].filter(Boolean).join(" ");
  return <input ref={ref} className={classes} {...props} />;
});

Input.displayName = "Input";
