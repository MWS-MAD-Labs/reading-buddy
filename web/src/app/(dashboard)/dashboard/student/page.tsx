import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import {
  getGamificationStats,
  getBadgesWithProgress,
  getStudentBadges,
} from "@/lib/gamification";
import {
  XPProgressCard,
  StatsGrid,
  StreakCard,
  BadgeGrid,
  RecentBadges,
} from "@/components/dashboard/gamification";
import { WeeklyChallengeCard } from "@/components/dashboard/student/WeeklyChallengeCard";
import { getWeeklyChallenge } from "../weekly-challenge-actions";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  const profileId = user.profileId!;
  const userId = user.userId;

  // If userId is not in session (old session), fetch it from database
  if (!userId) {
    console.error("userId not in session - user needs to login again");
    throw new Error("Please log out and log in again to refresh your session");
  }

  console.log("Student page - userId:", userId, "profileId:", profileId);

  // Get gamification stats
  const gamificationStats = await getGamificationStats(userId, profileId);
  const badgesWithProgress = await getBadgesWithProgress(userId, profileId);
  const earnedBadges = await getStudentBadges(userId, profileId);

  // Get weekly challenge
  const weeklyChallengeResult = await getWeeklyChallenge(profileId);
  const weeklyChallenge = weeklyChallengeResult.success
    ? weeklyChallengeResult.data
    : null;

  // Get recent badges (last 3 earned)
  const recentBadges = earnedBadges.slice(0, 3).map((sb: any) => ({
    badge: sb.badge,
    earnedAt: sb.earned_at,
  }));

  // Get student's current readings (personal progress)
  const assignmentsResult = await queryWithContext(
    userId,
    `SELECT
      sb.book_id,
      sb.current_page,
      sb.updated_at,
      sb.started_at,
      b.id as book_id_ref,
      b.title,
      b.author,
      b.cover_url
    FROM student_books sb
    JOIN books b ON sb.book_id = b.id
    WHERE sb.student_id = $1
    ORDER BY sb.updated_at DESC, sb.started_at DESC`,
    [profileId],
  );

  const assignments = assignmentsResult.rows.map((row: any) => ({
    book_id: row.book_id,
    current_page: row.current_page,
    updated_at: row.updated_at,
    started_at: row.started_at,
    books: {
      id: row.book_id_ref,
      title: row.title,
      author: row.author,
      cover_url: row.cover_url,
    },
  }));

  console.log("Student ID:", profileId);
  console.log("Assignments count:", assignments.length);

  const assignedBookIds = assignments.map((assignment: any) => assignment.book_id);

  // Get student's classes
  const studentClassesResult = await queryWithContext(
    userId,
    `SELECT class_id FROM class_students WHERE student_id = $1`,
    [profileId],
  );

  const classIds = studentClassesResult.rows.map((c: any) => c.class_id);

  // Get which classrooms assigned each book (for display purposes)
  const bookClassrooms: Map<number, string[]> = new Map();
  if (classIds.length > 0 && assignedBookIds.length > 0) {
    const classBookResult = await queryWithContext(
      userId,
      `SELECT cb.book_id, cb.class_id, c.name
       FROM class_books cb
       JOIN classes c ON cb.class_id = c.id
       WHERE cb.class_id = ANY($1::int[]) AND cb.book_id = ANY($2::int[])`,
      [classIds, assignedBookIds],
    );

    classBookResult.rows.forEach((item: any) => {
      const className = item.name ?? "Unknown class";
      if (!bookClassrooms.has(item.book_id)) {
        bookClassrooms.set(item.book_id, []);
      }
      bookClassrooms.get(item.book_id)?.push(className);
    });
  }

  // Get classroom details for the student
  let classrooms: Array<{
    id: number;
    name: string;
    teacher_name: string;
  }> = [];

  if (classIds.length > 0) {
    const classRowsResult = await queryWithContext(
      userId,
      `SELECT c.id, c.name, p.full_name as teacher_name
       FROM classes c
       JOIN profiles p ON c.teacher_id = p.id
       WHERE c.id = ANY($1::int[])`,
      [classIds],
    );

    classrooms = classRowsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      teacher_name: row.teacher_name ?? "Unknown teacher",
    }));
  }

  return (
    <div className="space-y-8">
      {/* Header with XP */}
      <header className="space-y-2 rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(147,118,255,0.25)]">
        <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
          Student zone
        </p>
        <h1 className="text-3xl font-black">My Dashboard</h1>
        <p className="text-sm text-indigo-500">
          Track your reading progress and achievements.
        </p>
      </header>

      {/* Gamification Section */}
      {gamificationStats && (
        <div className="grid gap-5 lg:grid-cols-2">
          <XPProgressCard stats={gamificationStats} />
          <StreakCard
            currentStreak={gamificationStats.reading_streak}
            longestStreak={gamificationStats.longest_streak}
          />
        </div>
      )}

      {/* Quick Stats */}
      {gamificationStats && <StatsGrid stats={gamificationStats} />}

      {/* Weekly Challenge */}
      {weeklyChallenge && <WeeklyChallengeCard challenge={weeklyChallenge} />}

      {/* Recent Badges */}
      {recentBadges.length > 0 && <RecentBadges badges={recentBadges} />}

      {/* Current Readings */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-indigo-950">My Readings</h2>
          <p className="text-sm text-indigo-500">Pick up where you left off.</p>
        </div>

        {assignments?.length ? (
          <ul className="grid gap-5 md:grid-cols-2">
            {assignments.map((assignment: any) => {
              const book = assignment.books;
              return (
                <li
                  key={assignment.book_id}
                  className="rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-pink-50 to-amber-50 p-5 text-indigo-900 shadow-[0_15px_50px_rgba(255,158,197,0.3)]"
                >
                  <div className="flex gap-4">
                    {/* Book Cover */}
                    {book?.cover_url && (
                      <div className="flex-shrink-0">
                        <img
                          src={book.cover_url}
                          alt={`Cover of ${book.title}`}
                          className="h-32 w-24 rounded-lg object-cover shadow-md"
                        />
                      </div>
                    )}

                    {/* Book Info */}
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="text-xs uppercase tracking-wide text-rose-400">
                        {bookClassrooms.has(assignment.book_id) &&
                        bookClassrooms.get(assignment.book_id)!.length > 0 ? (
                          <>
                            Assigned reading
                            <span className="ml-2 font-normal">
                              •{" "}
                              {bookClassrooms
                                .get(assignment.book_id)!
                                .join(", ")}
                            </span>
                          </>
                        ) : (
                          "Personal reading"
                        )}
                      </p>
                      <h2 className="text-xl font-black text-indigo-950">
                        {book?.title ?? "Unknown title"}
                      </h2>
                      <p className="text-sm text-indigo-500">{book?.author}</p>
                      <p className="text-xs text-indigo-400">
                        Current page: {assignment.current_page ?? 1}
                      </p>
                      <Link
                        href={`/dashboard/student/read/${assignment.book_id}?page=${assignment.current_page ?? 1}`}
                        className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                      >
                        Continue reading
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[28px] border border-dashed border-indigo-200 bg-white/80 p-8 text-center text-indigo-500">
            No books in progress yet. Once you start reading, your books will
            show up here.
          </div>
        )}
      </section>

      {/* Classrooms Section */}
      <section className="space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black">My Classrooms</h2>
            <p className="text-sm text-indigo-500">
              Jump into your class to see assigned books and quizzes.
            </p>
          </div>
        </div>
        {classrooms.length ? (
          <ul className="space-y-3">
            {classrooms.map((classroom: any) => (
              <li
                key={classroom.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-white/80 p-4 text-indigo-900 shadow-[0_12px_30px_rgba(79,70,229,0.15)]"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">
                    Classroom
                  </p>
                  <p className="text-base font-semibold">{classroom.name}</p>
                  <p className="text-xs text-indigo-500">
                    Teacher: {classroom.teacher_name}
                  </p>
                </div>
                <Link
                  href={`/dashboard/student/classrooms/${classroom.id}`}
                  className="rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                >
                  Enter class
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-indigo-400">
            You&apos;re not enrolled in any classrooms yet.
          </p>
        )}
      </section>

      {/* Badges Section */}
      {badgesWithProgress.length > 0 && (
        <section className="space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
          <BadgeGrid
            badges={badgesWithProgress}
            title="My Badges"
            maxDisplay={6}
          />
          <div className="flex justify-center pt-2">
            <Link
              href="/dashboard/student/badges"
              className="text-sm font-medium text-indigo-500 hover:text-indigo-700"
            >
              View all badges
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
