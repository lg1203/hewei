import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300",
  secondary:
    "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:text-brand-300",
  outline:
    "border border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger:
    "bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300",
  dark: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-700"
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3 text-xs gap-1.5",
  md: "h-10 rounded-xl px-4 text-sm gap-2",
  lg: "h-12 rounded-xl px-5 text-[15px] gap-2",
  icon: "h-9 w-9 rounded-lg"
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {children}
    </button>
  )
);
Button.displayName = "Button";
