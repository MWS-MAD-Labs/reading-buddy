import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const roleLabel =
    profile?.role === "ADMIN"
      ? "Admin"
      : profile?.role === "TEACHER"
        ? "Teacher"
        : profile?.role === "LIBRARIAN"
          ? "Librarian"
          : profile?.role === "STUDENT"
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
                profile?.role as
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
                profile?.role as
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
