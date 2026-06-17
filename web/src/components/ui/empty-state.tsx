"use client";

import { cn } from "@/lib/cn";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?:
    | "default"
    | "books"
    | "students"
    | "results"
    | "notifications"
    | "error";
  className?: string;
}

const variantStyles = {
  default: {
    bg: "from-[#fffaf4] to-[#F5E7E8]",
    icon: "text-[#7E1518]",
    title: "text-[#7E1518]",
    description: "text-[#5d4b4c]",
  },
  books: {
    bg: "from-[#EFF8FE] to-white",
    icon: "text-[#25638e]",
    title: "text-[#7E1518]",
    description: "text-[#5d4b4c]",
  },
  students: {
    bg: "from-[#EDF3EB] to-white",
    icon: "text-[#486142]",
    title: "text-[#7E1518]",
    description: "text-[#5d4b4c]",
  },
  results: {
    bg: "from-[#FBF2DF] to-white",
    icon: "text-[#D6A13A]",
    title: "text-[#7E1518]",
    description: "text-[#5d4b4c]",
  },
  notifications: {
    bg: "from-[#EFF8FE] to-[#F5E7E8]",
    icon: "text-[#1F2A44]",
    title: "text-[#7E1518]",
    description: "text-[#5d4b4c]",
  },
  error: {
    bg: "from-[#F8EAEB] to-white",
    icon: "text-[#B94A4E]",
    title: "text-[#B94A4E]",
    description: "text-[#5d4b4c]",
  },
};

const defaultIcons = {
  books: (
    <svg
      className="h-24 w-24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  students: (
    <svg
      className="h-24 w-24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  results: (
    <svg
      className="h-24 w-24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  notifications: (
    <svg
      className="h-24 w-24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-24 w-24"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const styles = variantStyles[variant];
  const defaultIcon = variant !== "default" ? defaultIcons[variant] : null;

  return (
    <div
      className={cn(
        "flex min-h-[400px] items-center justify-center rounded-[28px] border border-dashed border-[#D6A13A]/70 p-8 card-shadow",
        `bg-gradient-to-br ${styles.bg}`,
        className,
      )}
    >
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className={cn("mx-auto mb-6", styles.icon)}>
          {icon || defaultIcon || (
            <svg
              className="h-24 w-24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn("heading-font mb-2 text-2xl font-bold", styles.title)}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className={cn("mb-6 text-base font-semibold", styles.description)}>
            {description}
          </p>
        )}

        {/* Action Button */}
        {action && (
          <Button onClick={action.onClick} variant="primary" size="lg">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Preset variants for common use cases
export function NoBooksEmptyState({ onAddBook }: { onAddBook?: () => void }) {
  return (
    <EmptyState
      variant="books"
      title="No books yet"
      description="Upload your first book to get started with Reading Buddy!"
      action={
        onAddBook
          ? {
              label: "Upload Book",
              onClick: onAddBook,
            }
          : undefined
      }
    />
  );
}

export function NoStudentsEmptyState({
  onAddStudent,
}: {
  onAddStudent?: () => void;
}) {
  return (
    <EmptyState
      variant="students"
      title="No students in this class"
      description="Add students to start tracking their reading progress."
      action={
        onAddStudent
          ? {
              label: "Add Students",
              onClick: onAddStudent,
            }
          : undefined
      }
    />
  );
}

export function NoResultsEmptyState() {
  return (
    <EmptyState
      variant="results"
      title="No results found"
      description="Try adjusting your search or filter criteria."
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyState
      variant="notifications"
      title="All caught up!"
      description="You don't have any new notifications."
    />
  );
}

export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description="We encountered an error. Please try again."
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
