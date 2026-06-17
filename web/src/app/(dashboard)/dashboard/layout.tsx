import type { ReactNode } from "react";
import Image from "next/image";
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
    <div className="min-h-screen text-[#241718]">
      <header className="sticky top-0 z-40 border-b border-[#eadfda] bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgba(36,23,24,0.06)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 lg:gap-6">
          {/* Logo and Role */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="heading-font inline-flex items-center gap-2 rounded-full border border-[#7E1518]/15 bg-[#F5E7E8] px-3 py-2 text-sm font-bold text-[#7E1518]">
              <Image
                src="/logo.svg"
                alt="Reading Buddy logo"
                width={22}
                height={22}
                className="rounded-md"
              />
              Reading Buddy
            </div>
            <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#7a5311] sm:block">
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

      <main className="page-transition mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {children}
      </main>
    </div>
  );
}
