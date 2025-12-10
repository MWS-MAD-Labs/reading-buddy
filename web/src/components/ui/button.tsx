import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "btn-3d btn-squish inline-flex items-center justify-center gap-2 rounded-2xl border-4 font-black tracking-tight transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-purple-500 to-rose-500 text-white border-pink-200 shadow-[0_20px_45px_rgba(146,64,255,0.25)] hover:from-purple-600 hover:to-rose-600",
        secondary:
          "bg-gradient-to-r from-emerald-400 to-teal-400 text-white border-emerald-200 shadow-[0_18px_40px_rgba(16,185,129,0.25)] hover:from-emerald-500 hover:to-teal-500",
        neutral:
          "bg-white/90 text-indigo-900 border-indigo-100 shadow-[0_16px_36px_rgba(79,70,229,0.12)] hover:border-indigo-200 hover:shadow-[0_18px_46px_rgba(79,70,229,0.16)]",
        outline:
          "bg-white/70 text-purple-700 border-purple-200 shadow-[0_12px_30px_rgba(124,58,237,0.08)] hover:bg-white hover:border-purple-300",
        ghost:
          "bg-transparent text-purple-700 border-transparent shadow-none hover:bg-white/60 hover:border-purple-200",
        danger:
          "bg-gradient-to-r from-rose-500 to-orange-400 text-white border-amber-200 shadow-[0_18px_40px_rgba(248,113,113,0.25)] hover:from-rose-600 hover:to-orange-500",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-12 px-5 text-base",
        lg: "h-14 px-6 text-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    icon?: React.ReactNode;
    loading?: boolean;
  };

const Spinner = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5 animate-spin text-current"
    role="presentation"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
    />
  </svg>
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      icon,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? <Spinner /> : icon}
        <span className="truncate">{loading ? "Working…" : children}</span>
      </button>
    );
  },
);
Button.displayName = "Button";
