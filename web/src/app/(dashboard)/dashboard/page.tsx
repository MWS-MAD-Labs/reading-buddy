import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/auth/roleCheck";
import { SystemStatsCards } from "@/components/dashboard/admin/SystemStatsCards";
import { LibrarianStatsCards } from "@/components/dashboard/librarian/LibrarianStatsCards";
import { getSystemStats } from "./admin/actions";
import { getLibrarianStats } from "./librarian/stats-actions";

export const dynamic = "force-dynamic";

type QuickLink = { href: string; title: string; description: string };

const roleQuickLinks: Record<UserRole | "DEFAULT", QuickLink[]> = {
  STUDENT: [
    {
      href: "/dashboard/student",
      title: "My Shelf",
      description: "See your assignments & progress.",
    },
    {
      href: "/dashboard/library",
      title: "Library",
      description: "Browse new adventures to read.",
    },
    {
      href: "/dashboard/student",
      title: "Reader Tips",
      description: "Learn how to use the reader & earn badges.",
    },
  ],
  TEACHER: [
    {
      href: "/dashboard/teacher",
      title: "Classroom",
      description: "Monitor reading progress.",
    },
    {
      href: "/dashboard/student",
      title: "Student View",
      description: "Preview the student dashboard.",
    },
    {
      href: "/dashboard/library",
      title: "Library",
      description: "Recommend new titles for class.",
    },
  ],
  LIBRARIAN: [
    {
      href: "/dashboard/librarian",
      title: "Upload Books",
      description: "Add PDFs, covers, and metadata.",
    },
    {
      href: "/dashboard/library",
      title: "Library",
      description: "Review the shared collection.",
    },
    {
      href: "/dashboard/teacher",
      title: "Teacher Tools",
      description: "Coordinate with classrooms.",
    },
  ],
  ADMIN: [
    {
      href: "/dashboard/admin",
      title: "Admin Panel",
      description: "Manage users and roles.",
    },
    {
      href: "/dashboard/librarian",
      title: "Librarian Tools",
      description: "Support book uploads.",
    },
    {
      href: "/dashboard/teacher",
      title: "Teacher Overview",
      description: "Check classroom dashboards.",
    },
  ],
  DEFAULT: [
    {
      href: "/dashboard/library",
      title: "Library",
      description: "Browse all uploaded books.",
    },
    {
      href: "/dashboard/student",
      title: "Student",
      description: "See assigned readings and progress.",
    },
    {
      href: "/dashboard/librarian",
      title: "Librarian",
      description: "Upload PDFs and covers.",
    },
  ],
};

const heroCopy: Record<UserRole | "DEFAULT", { title: string; body: string }> =
  {
    STUDENT: {
      title: "Welcome back to your reading list",
      body: "Jump into your stories, earn badges, and explore new worlds picked for you.",
    },
    TEACHER: {
      title: "Classroom insights at a glance",
      body: "Keep tabs on reading progress, celebrate milestones, and share quizzes with your students.",
    },
    LIBRARIAN: {
      title: "Keep the collection organized",
      body: "Upload books, maintain metadata, and make sure every reader has something great to open.",
    },
    ADMIN: {
      title: "Manage roles and visibility",
      body: "Keep access up to date, monitor the system, and support every team.",
    },
    DEFAULT: {
      title: "Welcome to your library workspace",
      body: "Manage books, track reading progress, and build AI-powered quizzes in one place.",
    },
  };

export default async function DashboardHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const role = (profile?.role as UserRole | undefined) ?? "DEFAULT";
  const copy = heroCopy[role] ?? heroCopy.DEFAULT;
  const links = roleQuickLinks[role] ?? roleQuickLinks.DEFAULT;

  // Fetch stats based on role
  // Admin sees all stats from all roles
  const adminStatsResult =
    role === "ADMIN" || role === "LIBRARIAN" ? await getSystemStats() : null;
  const librarianStatsResult =
    role === "ADMIN" || role === "LIBRARIAN" ? await getLibrarianStats() : null;

  return (
    <div className="space-y-8">
      <section className="pop-in rounded-[32px] border border-white/60 bg-white/90 p-8 text-indigo-950 shadow-[0_30px_90px_rgba(147,118,255,0.25)]">
        <div className="mb-3 inline-block rounded-full border border-rose-200 bg-gradient-to-r from-rose-200 to-amber-200 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">
          Reading Buddy
        </div>
        <h1 className="mt-2 text-4xl font-black">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-indigo-500">{copy.body}</p>
      </section>

      {/* Admin gets all overview cards */}
      {role === "ADMIN" && (
        <>
          {/* System Overview */}
          {adminStatsResult?.success && adminStatsResult.data && (
            <SystemStatsCards stats={adminStatsResult.data} />
          )}

          {/* Librarian Overview */}
          {librarianStatsResult?.success && librarianStatsResult.data && (
            <LibrarianStatsCards stats={librarianStatsResult.data} />
          )}

          {/* Error states for admin */}
          {adminStatsResult && !adminStatsResult.success && (
            <div className="rounded-2xl border-4 border-rose-200 bg-rose-50 p-4">
              <p className="font-semibold text-rose-800">
                Failed to load system statistics: {adminStatsResult.error}
              </p>
            </div>
          )}

          {librarianStatsResult && !librarianStatsResult.success && (
            <div className="rounded-2xl border-4 border-rose-200 bg-rose-50 p-4">
              <p className="font-semibold text-rose-800">
                Failed to load librarian statistics:{" "}
                {librarianStatsResult.error}
              </p>
            </div>
          )}
        </>
      )}

      {/* Librarian gets their specific overview */}
      {role === "LIBRARIAN" && (
        <>
          {librarianStatsResult?.success && librarianStatsResult.data && (
            <LibrarianStatsCards stats={librarianStatsResult.data} />
          )}

          {librarianStatsResult && !librarianStatsResult.success && (
            <div className="rounded-2xl border-4 border-rose-200 bg-rose-50 p-4">
              <p className="font-semibold text-rose-800">
                Failed to load librarian statistics:{" "}
                {librarianStatsResult.error}
              </p>
            </div>
          )}
        </>
      )}

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((card) => (
          <Link
            key={`${card.href}-${card.title}`}
            href={card.href}
            className="sticker-card rounded-3xl border border-white/70 bg-gradient-to-br from-blue-50 to-purple-50 p-6 text-indigo-900 shadow-lg transition hover:scale-105 hover:shadow-[0_20px_50px_rgba(147,118,255,0.25)]"
          >
            <h2 className="text-2xl font-black text-indigo-800">
              {card.title}
            </h2>
            <p className="mt-2 text-base font-semibold text-indigo-500">
              {card.description}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
