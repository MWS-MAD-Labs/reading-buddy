import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "heading-font inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        bubble: "bg-[#F5E7E8] text-[#7E1518]",
        sky: "bg-[#EFF8FE] text-[#25638e]",
        lime: "bg-[#EDF3EB] text-[#486142]",
        amber: "bg-[#FBF2DF] text-[#7a5311]",
        neutral: "bg-white text-[#241718] ring-1 ring-[#eadfda]",
        outline: "bg-transparent text-[#7E1518] ring-1 ring-[#7E1518]/25",
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
