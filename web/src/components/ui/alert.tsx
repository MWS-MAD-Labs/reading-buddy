import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva(
  "rounded-2xl border px-4 py-3 font-medium shadow-[0_12px_30px_rgba(36,23,24,0.06)] md:px-5 md:py-4",
  {
    variants: {
      variant: {
        info: "border-[#B8DDF8]/70 bg-[#EFF8FE] text-[#1F2A44]",
        success: "border-[#6F8B6A]/35 bg-[#EDF3EB] text-[#486142]",
        warning: "border-[#D6A13A]/45 bg-[#FBF2DF] text-[#7a5311]",
        error: "border-[#B94A4E]/35 bg-[#F8EAEB] text-[#B94A4E]",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const icons: Record<
  NonNullable<VariantProps<typeof alertVariants>["variant"]>,
  string
> = {
  info: "✦",
  success: "✓",
  warning: "!",
  error: "!",
};

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string;
  };

export const Alert = ({
  className,
  variant,
  title,
  children,
  ...props
}: AlertProps) => {
  const icon = icons[variant ?? "info"];
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <div className="space-y-1 text-sm md:text-base">
          {title ? <p className="heading-font font-bold">{title}</p> : null}
          <div className="font-semibold leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
};
