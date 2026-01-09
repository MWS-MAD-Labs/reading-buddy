import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import type { UserRole } from "@/lib/auth/roleCheck";
import { SystemStatsCards } from "@/components/dashboard/admin/SystemStatsCards";
import { LibrarianStatsCards } from "@/components/dashboard/librarian/LibrarianStatsCards";
import { ReadingJourneySection } from "@/components/dashboard/student";
import {
  StudentLeaderboard,
  StaffLeaderboard,
} from "@/components/dashboard/leaderboard";
import { getGamificationStats } from "@/lib/gamification";
import { getSystemStats } from "./admin/actions";
import { getLibrarianStats } from "./librarian/stats-actions";
import {
  getStudentLeaderboard,
  getStaffLeaderboard,
} from "./leaderboard-actions";
import { RecentBadges } from "@/components/dashboard/RecentBadges";
import { getStudentBadges } from "@/lib/gamification";

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
  // Get current user from NextAuth
  const user = await getCurrentUser();

  // Get role from session (populated by NextAuth session callback)
  const role = (user.role as UserRole | undefined) ?? "DEFAULT";
  const copy = heroCopy[role] ?? heroCopy.DEFAULT;
  const links = roleQuickLinks[role] ?? roleQuickLinks.DEFAULT;

  // Fetch reading journey data for ALL users (since everyone can read)
  let readingJourneyData: {
    stats: Awaited<ReturnType<typeof getGamificationStats>> | null;
    currentBook: {
      id: number;
      title: string;
      author: string;
      cover_url: string;
      current_page: number;
      total_pages: number | null;
      progress_percentage: number;
    } | null;
  } | null = null;

  if (user && user.userId && user.profileId) {
    const { getReadingJourneyData } = await import("./dashboard-actions");
    const result = await getReadingJourneyData(user.userId, user.profileId);
    if (result.success && result.data) {
      readingJourneyData = result.data;
    }
  }

  const shouldShowTeacherOverview = role === "TEACHER" || role === "ADMIN";
  let teacherOverview: {
    classCount: number;
    studentCount: number;
    completionRate: number;
    activeAssignments: number;
    recentCompletions: Array<{
      student: string;
      bookTitle: string;
      completedAt: string | null;
    }>;
  } | null = null;

  if (shouldShowTeacherOverview && user && user.userId && user.profileId) {
    const { getTeacherOverview } = await import("./dashboard-actions");
    const result = await getTeacherOverview(user.userId, user.profileId, role);
    if (result.success && result.data) {
      teacherOverview = result.data;
    }
  }

  // Fetch leaderboard data
  let leaderboardData: {
    studentLeaderboard: Awaited<
      ReturnType<typeof getStudentLeaderboard>
    > | null;
    staffLeaderboard: Awaited<ReturnType<typeof getStaffLeaderboard>> | null;
  } | null = null;

  if (user && user.userId && user.profileId) {
    const isStudent = role === "STUDENT";
    const studentLeaderboard = isStudent
      ? await getStudentLeaderboard(user.userId, user.profileId, 5)
      : null;
    const staffLeaderboard = !isStudent
      ? await getStaffLeaderboard(user.userId, user.profileId, 5)
      : null;

    leaderboardData = {
      studentLeaderboard,
      staffLeaderboard,
    };
  }

  // Fetch recent badges
  let recentBadges: Awaited<ReturnType<typeof getStudentBadges>> = [];
  if (user && user.userId && user.profileId) {
    recentBadges = await getStudentBadges(user.userId, user.profileId);
  }

  // Fetch stats based on role
  // Admin sees all stats from all roles
  const adminStatsResult =
    role === "ADMIN" && user && user.userId ? await getSystemStats() : null;
  const librarianStatsResult =
    (role === "LIBRARIAN" || role === "ADMIN") && user && user.userId
      ? await getLibrarianStats(user.userId)
      : null;

  return (
    <div className="space-y-8">
      <section className="pop-in rounded-[32px] border border-white/60 bg-white/90 p-8 text-indigo-950 shadow-[0_30px_90px_rgba(147,118,255,0.25)]">
        <div className="mb-3 inline-block rounded-full border border-rose-200 bg-gradient-to-r from-rose-200 to-amber-200 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">
          Reading Buddy
        </div>
        <h1 className="mt-2 text-4xl font-black">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-indigo-500">{copy.body}</p>
      </section>

      {/* Reading Journey Section - Available for ALL users */}
      {readingJourneyData && (
        <ReadingJourneySection
          stats={readingJourneyData.stats}
          currentBook={readingJourneyData.currentBook}
          showTitle={true}
        />
      )}

      {/* Progress & Rankings Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leaderboard Section - Takes 2/3 on desktop if possible, but let's keep it simple for now */}
        <div className="lg:col-span-2">
          {leaderboardData && (
            <div className="h-full">
              {/* Student Leaderboard */}
              {leaderboardData.studentLeaderboard?.success &&
                leaderboardData.studentLeaderboard.data && (
                  <StudentLeaderboard
                    entries={leaderboardData.studentLeaderboard.data.entries}
                    currentUserEntry={
                      leaderboardData.studentLeaderboard.data.currentUserEntry
                    }
                    totalParticipants={
                      leaderboardData.studentLeaderboard.data.totalParticipants
                    }
                    showFullList={false}
                  />
                )}

              {/* Staff Leaderboard */}
              {leaderboardData.staffLeaderboard?.success &&
                leaderboardData.staffLeaderboard.data && (
                  <StaffLeaderboard
                    entries={leaderboardData.staffLeaderboard.data.entries}
                    currentUserEntry={
                      leaderboardData.staffLeaderboard.data.currentUserEntry
                    }
                    totalParticipants={
                      leaderboardData.staffLeaderboard.data.totalParticipants
                    }
                    showFullList={false}
                  />
                )}

              {!leaderboardData.studentLeaderboard?.data && !leaderboardData.staffLeaderboard?.data && (
                <div className="flex h-full items-center justify-center rounded-[32px] border border-dashed border-indigo-200 bg-white/50 p-12 text-center">
                  <p className="font-bold text-indigo-300">Leaderboard data currently unavailable</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Badges Section - Takes 1/3 on desktop */}
        <div className="lg:col-span-1">
          <RecentBadges
            badges={recentBadges.slice(0, 4)}
            totalBadges={recentBadges.length}
          />
        </div>
      </div>

      {(role === "TEACHER" || role === "ADMIN") && teacherOverview && (
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">
              Your Teaching Journey
            </p>
            <h2 className="text-2xl font-black text-indigo-950">
              Keep classrooms on track
            </h2>
            <p className="text-sm text-indigo-500">
              See class health, completions, and quick actions in one place.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-indigo-50 to-sky-50 p-5 shadow-[0_20px_50px_rgba(99,102,241,0.15)]">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">
                Class overview
              </p>
              <h3 className="mt-2 text-xl font-black text-indigo-900">
                {teacherOverview.classCount} classes
              </h3>
              <p className="text-sm text-indigo-500">
                {teacherOverview.studentCount} students total
              </p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-[0_20px_50px_rgba(16,185,129,0.15)]">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
                Completion rate
              </p>
              <h3 className="mt-2 text-xl font-black text-indigo-900">
                {teacherOverview.completionRate}% on track
              </h3>
              <div className="mt-3 h-2 rounded-full bg-white/60">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                  style={{ width: `${teacherOverview.completionRate}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-indigo-500">
                {teacherOverview.activeAssignments} active assignments
              </p>
            </div>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-amber-50 to-rose-50 p-5 shadow-[0_20px_50px_rgba(251,191,36,0.15)]">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-500">
                Quick actions
              </p>
              <div className="mt-3 space-y-2">
                <Link
                  href="/dashboard/teacher/classrooms"
                  className="block rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-indigo-900 shadow-sm transition hover:scale-[1.01]"
                >
                  Manage classrooms
                </Link>
                <Link
                  href="/dashboard/library"
                  className="block rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-indigo-900 shadow-sm transition hover:scale-[1.01]"
                >
                  Assign new books
                </Link>
                <Link
                  href="/dashboard/teacher"
                  className="block rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-indigo-900 shadow-sm transition hover:scale-[1.01]"
                >
                  Create assignments
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-purple-50 to-pink-50 p-5 shadow-[0_20px_50px_rgba(192,132,252,0.15)]">
              <p className="text-xs uppercase tracking-[0.2em] text-purple-500">
                Recent activity
              </p>
              <ul className="mt-2 space-y-2 text-sm font-semibold text-indigo-900">
                {teacherOverview.recentCompletions.length > 0 ? (
                  teacherOverview.recentCompletions.map((entry, idx) => (
                    <li
                      key={`${entry.student}-${idx}`}
                      className="rounded-xl border border-white/70 bg-white/70 px-3 py-2"
                    >
                      <p className="text-indigo-900">
                        {entry.student} finished {entry.bookTitle}
                      </p>
                      {entry.completedAt && (
                        <p className="text-xs text-indigo-500">
                          {new Date(entry.completedAt).toLocaleDateString()}
                        </p>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="text-indigo-500">
                    Recent completions will show here.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Admin gets merged overview */}
      {role === "ADMIN" && (
        <>
          {adminStatsResult?.success && adminStatsResult.data && (
            <SystemStatsCards stats={adminStatsResult.data} />
          )}

          {librarianStatsResult?.success && librarianStatsResult.data && (
            <LibrarianStatsCards
              stats={librarianStatsResult.data}
              variant="compact"
            />
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
        {links.map((card: any) => (
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
