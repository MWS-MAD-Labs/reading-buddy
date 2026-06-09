import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva("rounded-[28px] border card-shadow", {
  variants: {
    variant: {
      frosted: "border-[#eadfda] bg-white/90 text-[#241718] backdrop-blur-xl",
      playful:
        "border-[#eadfda] bg-gradient-to-br from-[#fffaf4] via-white to-[#eff8fe] text-[#241718]",
      glow: "border-[#B8DDF8]/55 bg-gradient-to-br from-white via-[#eff8fe] to-[#fbf2df] text-[#241718] shadow-[0_24px_70px_rgba(36,23,24,0.08)]",
    },
    padding: {
      snug: "p-4 md:p-5",
      cozy: "p-6 md:p-8",
      spacious: "p-8 md:p-10",
    },
  },
  defaultVariants: {
    variant: "frosted",
    padding: "cozy",
  },
});

export type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 space-y-1.5", className)} {...props} />
);

export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "heading-font text-xl font-bold leading-tight text-[#241718] md:text-2xl",
      className,
    )}
    {...props}
  />
);

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-sm leading-6 text-[#5d4b4c] md:text-base", className)}
    {...props}
  />
);

export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-4", className)} {...props} />
);

export const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-4 flex flex-wrap items-center gap-3", className)}
    {...props}
  />
);
