import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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

  const supabaseAdmin = getSupabaseAdminClient();

  const { data: profile } = user
    ? await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    : { data: null };

  const role = (profile?.role as UserRole | undefined) ?? "DEFAULT";
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

  if (user) {
    const stats = await getGamificationStats(supabaseAdmin, user.id);

    const statsWithLegacyFields = stats
      ? {
          ...stats,
          // Legacy aliases to keep older UI pieces safe
          total_xp: stats.xp ?? 0,
          current_level_min_xp: 0,
          next_level_min_xp: (stats.xp ?? 0) + (stats.xp_to_next_level ?? 0),
        }
      : null;

    // Get current reading book
    const { data: currentReading } = await supabaseAdmin
      .from("student_books")
      .select(
        "book_id, current_page, updated_at, started_at, books(id, title, author, cover_url)",
      )
      .eq("student_id", user.id)
      .order("updated_at", { ascending: false })
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let currentBook = null;
    if (currentReading && currentReading.books) {
      const bookData = Array.isArray(currentReading.books)
        ? currentReading.books[0]
        : currentReading.books;
      const book = bookData as {
        id: number;
        title: string;
        author: string;
        cover_url: string;
      } | null;

      if (book) {
        // TODO: Get actual page count from book metadata
        const estimatedTotalPages = 300;
        const currentPage = currentReading.current_page || 1;
        const progressPercentage = Math.min(
          (currentPage / estimatedTotalPages) * 100,
          100,
        );

        currentBook = {
          id: book.id,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          current_page: currentPage,
          total_pages: estimatedTotalPages,
          progress_percentage: progressPercentage,
        };
      }
    }

    readingJourneyData = {
      stats: statsWithLegacyFields,
      currentBook,
    };
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

  if (shouldShowTeacherOverview && user) {
    const classQuery = supabaseAdmin.from("classes").select("id, name");
    const { data: teacherClasses } =
      role === "TEACHER"
        ? await classQuery.eq("teacher_id", user.id)
        : await classQuery;

    const classIds = teacherClasses?.map((c) => c.id) ?? [];

    const { data: classStudents } = classIds.length
      ? await supabaseAdmin
          .from("class_students")
          .select("student_id")
          .in("class_id", classIds)
      : { data: [] };

    const studentIds = Array.from(
      new Set((classStudents ?? []).map((row) => row.student_id)),
    );

    const { count: totalAssignments } = studentIds.length
      ? await supabaseAdmin
          .from("student_books")
          .select("*", { count: "exact", head: true })
          .in("student_id", studentIds)
      : { count: 0 };

    const { count: completedAssignments } = studentIds.length
      ? await supabaseAdmin
          .from("student_books")
          .select("*", { count: "exact", head: true })
          .in("student_id", studentIds)
          .not("completed_at", "is", null)
      : { count: 0 };

    const { count: activeAssignments } = classIds.length
      ? await supabaseAdmin
          .from("class_books")
          .select("*", { count: "exact", head: true })
          .in("class_id", classIds)
      : { count: 0 };

    const { data: recentCompletions } = studentIds.length
      ? await supabaseAdmin
          .from("student_books")
          .select(
            "student_id, completed_at, profiles!student_books_student_id_fkey(full_name), books(title)",
          )
          .in("student_id", studentIds)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(3)
      : { data: [] };

    const completionRate =
      totalAssignments && totalAssignments > 0
        ? Math.round(((completedAssignments ?? 0) / totalAssignments) * 100)
        : 0;

    teacherOverview = {
      classCount: classIds.length,
      studentCount: studentIds.length,
      completionRate,
      activeAssignments: activeAssignments ?? 0,
      recentCompletions:
        recentCompletions?.map((entry) => {
          const profile =
            Array.isArray(entry.profiles) && entry.profiles.length > 0
              ? entry.profiles[0]
              : entry.profiles;
          const book =
            Array.isArray(entry.books) && entry.books.length > 0
              ? entry.books[0]
              : entry.books;

          return {
            student:
              (profile as { full_name?: string | null })?.full_name ??
              "Unknown student",
            bookTitle: (book as { title?: string })?.title ?? "Unknown book",
            completedAt: entry.completed_at ?? null,
          };
        }) ?? [],
    };
  }

  // Fetch leaderboard data
  let leaderboardData: {
    studentLeaderboard: Awaited<
      ReturnType<typeof getStudentLeaderboard>
    > | null;
    staffLeaderboard: Awaited<ReturnType<typeof getStaffLeaderboard>> | null;
  } | null = null;

  if (user) {
    const isStudent = role === "STUDENT";
    const studentLeaderboard = isStudent
      ? await getStudentLeaderboard(user.id, 5)
      : null;
    const staffLeaderboard = !isStudent
      ? await getStaffLeaderboard(user.id, 5)
      : null;

    leaderboardData = {
      studentLeaderboard,
      staffLeaderboard,
    };
  }

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

      {/* Reading Journey Section - Available for ALL users */}
      {readingJourneyData && (
        <ReadingJourneySection
          stats={readingJourneyData.stats}
          currentBook={readingJourneyData.currentBook}
          showTitle={true}
        />
      )}

      {/* Leaderboard Sections */}
      {leaderboardData && (
        <div className="grid gap-6 lg:grid-cols-2">
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
        </div>
      )}

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
