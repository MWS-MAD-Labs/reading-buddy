import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-[11px] font-black uppercase tracking-wide",
  {
    variants: {
      variant: {
        bubble:
          "bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white border-pink-200 shadow-[0_10px_30px_rgba(168,85,247,0.25)]",
        sky: "bg-gradient-to-r from-sky-400/90 to-blue-500/90 text-white border-blue-200 shadow-[0_10px_30px_rgba(59,130,246,0.25)]",
        lime: "bg-gradient-to-r from-lime-400/90 to-emerald-400/90 text-white border-lime-200 shadow-[0_10px_30px_rgba(74,222,128,0.25)]",
        amber:
          "bg-gradient-to-r from-amber-400/95 to-orange-400/95 text-white border-amber-200 shadow-[0_10px_30px_rgba(251,191,36,0.25)]",
        neutral:
          "bg-white/90 text-purple-700 border-purple-200 shadow-[0_12px_28px_rgba(124,58,237,0.12)]",
        outline:
          "bg-transparent text-purple-700 border-purple-300 shadow-none",
      },
      size: {
        sm: "text-[10px] px-2.5 py-1",
        md: "text-[11px] px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "bubble",
      size: "md",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, size, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
};
