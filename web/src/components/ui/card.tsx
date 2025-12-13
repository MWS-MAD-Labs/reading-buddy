import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva(
  "rounded-[28px] border shadow-[0_20px_70px_rgba(124,58,237,0.12)]",
  {
    variants: {
      variant: {
        frosted:
          "bg-white/80 border-white/70 backdrop-blur-xl text-indigo-950",
        playful:
          "bg-gradient-to-br from-yellow-50 via-white to-pink-50 border-amber-100 text-indigo-950",
        glow:
          "bg-gradient-to-br from-purple-50 to-sky-50 border-purple-100 text-indigo-950 shadow-[0_25px_90px_rgba(79,70,229,0.15)]",
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
  },
);

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
      "text-xl font-black leading-tight text-indigo-950 md:text-2xl",
      className,
    )}
    {...props}
  />
);

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-indigo-500 md:text-base", className)} {...props} />
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
  <div className={cn("mt-4 flex flex-wrap items-center gap-3", className)} {...props} />
);
