import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "heading-font btn-squish focus-ring inline-flex items-center justify-center gap-2 rounded-full border font-bold tracking-tight transition duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "border-[#7E1518] bg-[#7E1518] text-white shadow-[0_16px_36px_rgba(126,21,24,0.18)] hover:bg-[#681114]",
        secondary:
          "border-[#6F8B6A] bg-[#6F8B6A] text-white shadow-[0_14px_32px_rgba(111,139,106,0.18)] hover:bg-[#5c7858]",
        neutral:
          "border-[#eadfda] bg-white text-[#241718] shadow-[0_12px_30px_rgba(36,23,24,0.08)] hover:border-[#D6A13A]/50 hover:bg-[#fffaf4]",
        outline:
          "border-[#7E1518]/25 bg-white text-[#7E1518] shadow-[0_10px_24px_rgba(126,21,24,0.08)] hover:bg-[#F5E7E8]",
        ghost:
          "border-transparent bg-transparent text-[#7E1518] shadow-none hover:bg-[#F5E7E8]",
        danger:
          "border-[#B94A4E] bg-[#B94A4E] text-white shadow-[0_14px_32px_rgba(185,74,78,0.18)] hover:bg-[#9f3e42]",
      },
      size: {
        sm: "min-h-10 px-4 py-2 text-sm",
        md: "min-h-12 px-5 py-3 text-sm",
        lg: "min-h-14 px-6 py-3.5 text-base",
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
