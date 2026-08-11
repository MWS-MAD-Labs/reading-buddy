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
import { UpdateReadingProgressDialog } from "@/components/dashboard/student/UpdateReadingProgressDialog";
import {
  Badge as UiBadge,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
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
      sb.progress_percent,
      sb.progress_source,
      b.id as book_id_ref,
      b.title,
      b.author,
      b.cover_url,
      b.page_count,
      b.file_format
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
    progress_percent:
      row.progress_percent === null ? null : Number(row.progress_percent),
    progress_source: row.progress_source,
    books: {
      id: row.book_id_ref,
      title: row.title,
      author: row.author,
      cover_url: row.cover_url,
      page_count: row.page_count === null ? null : Number(row.page_count),
      file_format: row.file_format,
    },
  }));

  console.log("Student ID:", profileId);
  console.log("Assignments count:", assignments.length);

  const assignedBookIds = assignments.map(
    (assignment: any) => assignment.book_id,
  );

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
      <header>
        <Card variant="glow" padding="cozy">
          <UiBadge variant="amber" size="sm">
            Student zone
          </UiBadge>
          <CardTitle className="mt-3 text-3xl text-[#7E1518]">
            My Dashboard
          </CardTitle>
          <CardDescription>
            Track your reading progress and achievements.
          </CardDescription>
        </Card>
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
          <h2 className="heading-font text-xl font-bold text-[#7E1518]">
            My Readings
          </h2>
          <p className="text-sm leading-6 text-[#5d4b4c]">
            Pick up where you left off.
          </p>
        </div>

        {assignments?.length ? (
          <ul className="grid gap-5 md:grid-cols-2">
            {assignments.map((assignment: any) => {
              const book = assignment.books;
              return (
                <li key={assignment.book_id}>
                  <Card variant="playful" padding="snug">
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
                        <UiBadge variant="outline" size="sm" className="w-fit">
                          {bookClassrooms.has(assignment.book_id) &&
                          bookClassrooms.get(assignment.book_id)!.length > 0 ? (
                            <>
                              Assigned reading
                              <span className="ml-1 font-normal normal-case tracking-normal">
                                •{" "}
                                {bookClassrooms
                                  .get(assignment.book_id)!
                                  .join(", ")}
                              </span>
                            </>
                          ) : (
                            "Personal reading"
                          )}
                        </UiBadge>
                        <h2 className="heading-font text-xl font-bold text-[#7E1518]">
                          {book?.title ?? "Unknown title"}
                        </h2>
                        <p className="text-sm leading-6 text-[#5d4b4c]">
                          {book?.author}
                        </p>
                        <div className="space-y-1 text-xs text-[#6f6061]">
                          <p>
                            Current page: {assignment.current_page ?? 1}
                            {book.page_count !== null
                              ? ` of ${book.page_count}`
                              : ""}
                          </p>
                          {assignment.progress_percent !== null && (
                            <p>
                              {Math.min(100, assignment.progress_percent).toFixed(
                                assignment.progress_percent % 1 === 0 ? 0 : 1,
                              )}
                              % complete
                            </p>
                          )}
                          {assignment.progress_source === "manual_physical" && (
                            <p className="font-semibold text-[#7a5311]">
                              Updated from physical book
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/student/read/${assignment.book_id}?page=${assignment.current_page ?? 1}`}
                            className={buttonVariants({ size: "sm" })}
                          >
                            Continue reading
                          </Link>
                          <UpdateReadingProgressDialog
                            bookId={assignment.book_id}
                            bookTitle={book?.title ?? "this book"}
                            currentPage={assignment.current_page ?? 1}
                            totalPages={book.page_count}
                            fileFormat={book.file_format}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card
            variant="playful"
            padding="cozy"
            className="border-dashed border-[#D6A13A]/60 text-center text-[#7a5311]"
          >
            No books in progress yet. Once you start reading, your books will
            show up here.
          </Card>
        )}
      </section>

      {/* Classrooms Section */}
      <Card className="space-y-3" padding="cozy">
        <CardHeader className="mb-0 flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xl text-[#7E1518]">
              My Classrooms
            </CardTitle>
            <CardDescription>
              Jump into your class to see assigned books and quizzes.
            </CardDescription>
          </div>
        </CardHeader>
        {classrooms.length ? (
          <ul className="space-y-3">
            {classrooms.map((classroom: any) => (
              <li
                key={classroom.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#eadfda] bg-white p-4 text-[#241718]"
              >
                <div>
                  <UiBadge variant="amber" size="sm">
                    Classroom
                  </UiBadge>
                  <p className="heading-font text-base font-bold text-[#241718]">
                    {classroom.name}
                  </p>
                  <p className="text-xs text-[#6f6061]">
                    Teacher: {classroom.teacher_name}
                  </p>
                </div>
                <Link
                  href={`/dashboard/student/classrooms/${classroom.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Enter class
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#6f6061]">
            You&apos;re not enrolled in any classrooms yet.
          </p>
        )}
      </Card>

      {/* Badges Section */}
      {badgesWithProgress.length > 0 && (
        <Card className="space-y-3" padding="cozy">
          <BadgeGrid
            badges={badgesWithProgress}
            title="My Badges"
            maxDisplay={6}
          />
          <div className="flex justify-center pt-2">
            <Link
              href="/dashboard/student/badges"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View all badges
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
