import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-mentat-accent text-black font-medium hover:bg-mentat-accent-hover",
  secondary:
    "bg-mentat-bg-raised text-zinc-300 border border-mentat-border hover:bg-mentat-bg-surface hover:text-zinc-200",
  danger: "bg-mentat-bg-raised text-red-400 hover:bg-red-900/30 hover:text-red-300",
  ghost: "text-zinc-400 hover:text-zinc-200 hover:bg-mentat-bg-raised",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1.5",
};

const baseClasses = "inline-flex items-center rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "sm", className, ...props }, ref) => {
    const classes = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <button ref={ref} className={classes} {...props} />;
  }
);

Button.displayName = "Button";
