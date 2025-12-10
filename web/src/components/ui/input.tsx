import * as React from "react";
import { cn } from "@/lib/cn";

export const Label = ({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "flex items-center gap-2 text-sm font-black uppercase tracking-wide text-purple-700",
      className,
    )}
    {...props}
  />
);

const inputBase =
  "w-full rounded-2xl border-4 border-purple-200 bg-white/90 px-4 py-3 text-base font-semibold text-indigo-950 shadow-inner placeholder:text-purple-400 transition focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputBase, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      inputBase,
      "appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236b21a8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")] bg-[right_0.9rem_center] bg-no-repeat pr-12",
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
  <p className={cn("text-xs font-semibold text-indigo-500", className)} {...props} />
);

export const FieldError = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm font-bold text-rose-600", className)} {...props} />
);
