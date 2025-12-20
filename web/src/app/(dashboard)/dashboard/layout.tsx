import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/server";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Get current user from NextAuth (redirects to login if not authenticated)
  const user = await getCurrentUser();

  const roleLabel =
    user.role === "ADMIN"
      ? "Admin"
      : user.role === "TEACHER"
        ? "Teacher"
        : user.role === "LIBRARIAN"
          ? "Librarian"
          : user.role === "STUDENT"
            ? "Student"
            : "Reader";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 text-purple-900">
      <header className="border-b border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-yellow-50 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 lg:gap-6">
          {/* Logo and Role */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-yellow-200 bg-white/80 px-3 py-1 text-sm font-black uppercase tracking-wide text-yellow-700">
              Reading Buddy
            </div>
            <p className="hidden text-xs font-semibold uppercase text-purple-500 sm:block">
              {roleLabel}
            </p>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-4 lg:flex">
            <DashboardNav
              userRole={
                user.role as
                  | "ADMIN"
                  | "LIBRARIAN"
                  | "TEACHER"
                  | "STUDENT"
                  | null
              }
            />
            <SignOutButton />
          </div>

          {/* Mobile Navigation */}
          <div className="flex items-center gap-2 lg:hidden">
            <SignOutButton />
            <MobileNav
              userRole={
                user.role as
                  | "ADMIN"
                  | "LIBRARIAN"
                  | "TEACHER"
                  | "STUDENT"
                  | null
              }
            />
          </div>
        </div>
      </header>

      <main className="page-transition mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
