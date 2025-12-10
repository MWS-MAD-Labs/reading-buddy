import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva(
  "rounded-2xl border-4 px-4 py-3 font-semibold shadow-[0_14px_40px_rgba(0,0,0,0.08)] md:px-5 md:py-4",
  {
    variants: {
      variant: {
        info: "border-blue-200 bg-blue-50 text-blue-800",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        error: "border-rose-200 bg-rose-50 text-rose-800",
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
  info: "💡",
  success: "✅",
  warning: "⚠️",
  error: "⛔",
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
          {title ? (
            <p className="font-black uppercase tracking-wide">{title}</p>
          ) : null}
          <div className="font-semibold leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
};
