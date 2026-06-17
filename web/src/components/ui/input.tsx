import * as React from "react";
import { cn } from "@/lib/cn";

export const Label = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "heading-font flex items-center gap-2 text-sm font-bold text-[#241718]",
      className,
    )}
    {...props}
  />
);

const inputBase =
  "focus-ring w-full rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-base font-medium text-[#241718] placeholder:text-[#9b898a] transition focus-visible:border-[#D6A13A]";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputBase, className)} {...props} />
));
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      inputBase,
      "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%237E1518' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")] bg-[right_0.9rem_center] bg-no-repeat pr-12",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export const FieldHelper = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-xs font-medium text-[#6f6061]", className)}
    {...props}
  />
);

export const FieldError = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm font-bold text-[#B94A4E]", className)} {...props} />
);
