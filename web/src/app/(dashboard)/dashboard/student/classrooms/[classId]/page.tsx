import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import type { Book } from "@/types/database";
import { DiscussionStream } from "@/components/dashboard/DiscussionStream";
import { getClassroomMessages } from "./classroom-stream-actions";
import { MessageSquare, LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

const cardClass =
  "space-y-4 rounded-[28px] border border-white/70 bg-white/90 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(79,70,229,0.18)]";

export default async function StudentClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { classId: classIdParam } = await params;
  const { view: viewParam } = await searchParams;
  const classId = Number.parseInt(classIdParam, 10);
  const view = viewParam === "discussion" ? "discussion" : "overview";

  if (Number.isNaN(classId)) {
    notFound();
  }

  const user = await getCurrentUser();
  const userId = user.userId;
  const profileId = user.profileId;

  if (!userId || !profileId) {
    notFound();
  }

  // Ensure the current user belongs to this class
  const membershipResult = await query(
    `SELECT class_id FROM class_students WHERE class_id = $1 AND student_id = $2`,
    [classId, profileId]
  );

  if (membershipResult.rows.length === 0) {
    notFound();
  }

  // Load classroom details
  const classroomResult = await query(
    `SELECT c.id, c.name, p.full_name as teacher_name
     FROM classes c
     LEFT JOIN profiles p ON c.teacher_id = p.id
     WHERE c.id = $1`,
    [classId]
  );

  if (classroomResult.rows.length === 0) {
    notFound();
  }

  const classroom = {
    id: classroomResult.rows[0].id,
    name: classroomResult.rows[0].name,
  };

  const teacherProfile = {
    full_name: classroomResult.rows[0].teacher_name,
  };

  // Load assigned books for this classroom
  const assignedBooksResult = await query(
    `SELECT 
      cb.book_id,
      cb.assigned_at,
      b.id,
      b.title,
      b.author,
      b.cover_url
     FROM class_books cb
     LEFT JOIN books b ON cb.book_id = b.id
     WHERE cb.class_id = $1
     ORDER BY cb.assigned_at DESC`,
    [classId]
  );

  const assignedBooks = assignedBooksResult.rows.map((row: any) => ({
    book_id: row.book_id,
    id: row.id ?? row.book_id,
    title: row.title ?? "Untitled",
    author: row.author ?? null,
    cover_url: row.cover_url ?? null,
    assigned_at: row.assigned_at ?? null,
  }));

  // Get student's reading progress for these books
  const bookIds = assignedBooks.map((b: any) => b.book_id);
  const readingProgress: Map<number, { current_page: number }> = new Map();
  if (bookIds.length > 0) {
    const progressResult = await query(
      `SELECT book_id, current_page FROM student_books WHERE student_id = $1 AND book_id = ANY($2)`,
      [profileId, bookIds]
    );

    progressResult.rows.forEach((p: { book_id: number; current_page: number }) => {
      readingProgress.set(p.book_id, {
        current_page: p.current_page,
      });
    });
  }

  // Load quizzes assigned to this classroom
  const quizAssignmentsResult = await query(
    `SELECT 
      cqa.quiz_id,
      cqa.due_date,
      q.id,
      q.book_id,
      q.quiz_type,
      b.title as book_title
     FROM class_quiz_assignments cqa
     LEFT JOIN quizzes q ON cqa.quiz_id = q.id
     LEFT JOIN books b ON q.book_id = b.id
     WHERE cqa.class_id = $1 AND cqa.is_active = true
     ORDER BY cqa.due_date ASC NULLS LAST`,
    [classId]
  );

  const assignedQuizzes = quizAssignmentsResult.rows.map((row: any) => ({
    id: row.id ?? 0,
    book_id: row.book_id ?? 0,
    quiz_type: row.quiz_type ?? "classroom",
    books: row.book_title ? { title: row.book_title } : null,
    due_date: row.due_date as string | null,
  }));

  // Get quiz attempts to check which quizzes have been taken
  const quizIds = assignedQuizzes.map((q: any) => q.id);
  const quizAttempts: Map<number, { score: number; submitted_at: string }> =
    new Map();
  if (quizIds.length > 0) {
    const attemptsResult = await query(
      `SELECT quiz_id, score, submitted_at FROM quiz_attempts WHERE student_id = $1 AND quiz_id = ANY($2)`,
      [profileId, quizIds]
    );

    attemptsResult.rows.forEach(
      (attempt: { quiz_id: number; score: number; submitted_at: string }) => {
        quizAttempts.set(attempt.quiz_id, {
          score: attempt.score,
          submitted_at: attempt.submitted_at,
        });
      },
    );
  }

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  };

  // Get discussion messages if in discussion view
  const messages = view === "discussion" ? await getClassroomMessages(classId) : [];

  return (
    <div className="space-y-4">
      <section className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_rgba(147,118,255,0.2)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">
              My classroom
            </p>
            <h1 className="text-3xl font-black text-indigo-950">
              {classroom.name}
            </h1>
            <p className="text-sm font-medium text-indigo-500">
              Teacher: {teacherProfile?.full_name ?? "Unknown teacher"}
            </p>
          </div>
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(255,173,109,0.45)] transition hover:opacity-90"
          >
            &larr; Back to dashboard
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex gap-2 border-b border-indigo-100 pb-1">
          <Link
            href={`/dashboard/student/classrooms/${classId}`}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors rounded-t-lg
              ${view === 'overview'
                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
              }
            `}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>
          <Link
            href={`/dashboard/student/classrooms/${classId}?view=discussion`}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors rounded-t-lg
              ${view === 'discussion'
                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
              }
            `}
          >
            <MessageSquare className="h-4 w-4" />
            Discussion
          </Link>
        </div>
      </section>

      {view === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className={cardClass}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-400">
                  Reading list
                </p>
                <h2 className="text-xl font-black text-indigo-950">
                  Books for this class
                </h2>
                <p className="text-sm text-indigo-500">
                  Start reading to track your progress.
                </p>
              </div>
            </div>
            {assignedBooks.length ? (
              <ul className="mt-2 grid gap-5 md:grid-cols-2">
                {assignedBooks.map((book: any) => {
                  const progress = readingProgress.get(book.book_id);
                  const hasStarted = !!progress;
                  const currentPage = progress?.current_page ?? 1;

                  return (
                    <li
                      key={book.book_id}
                      className="rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-pink-50 to-amber-50 p-5 text-indigo-900 shadow-[0_15px_50px_rgba(255,158,197,0.3)]"
                    >
                      <div className="flex gap-4">
                        {/* Book Cover */}
                        {book.cover_url && (
                          <div className="flex-shrink-0">
                            <Image
                              unoptimized
                              src={book.cover_url}
                              alt={`Cover of ${book.title}`}
                              width={96}
                              height={128}
                              className="h-32 w-24 rounded-lg object-cover shadow-md"
                            />
                          </div>
                        )}

                        {/* Book Info */}
                        <div className="flex flex-1 flex-col gap-2">
                          <p className="text-xs uppercase tracking-wide text-rose-400">
                            Assigned book
                          </p>
                          <h2 className="text-xl font-black text-indigo-950">
                            {book.title}
                          </h2>
                          <p className="text-sm text-indigo-500">
                            {book.author ?? "Unknown author"}
                          </p>
                          {hasStarted ? (
                            <p className="text-xs text-indigo-400">
                              Current page: {currentPage}
                            </p>
                          ) : (
                            book.assigned_at && (
                              <p className="text-xs text-indigo-400">
                                Assigned: {formatDate(book.assigned_at)}
                              </p>
                            )
                          )}
                          <Link
                            href={`/dashboard/student/read/${book.id}${hasStarted ? `?page=${currentPage}` : ""}`}
                            className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                          >
                            {hasStarted ? "Continue reading" : "Start reading"} →
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-indigo-400">
                No books have been assigned to this classroom yet.
              </p>
            )}
          </section>

          {assignedQuizzes.length > 0 && (
            <section className={cardClass}>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1">
                  <p className="text-xs font-black uppercase tracking-wide text-purple-600">
                    Class quizzes
                  </p>
                </div>
                <h2 className="text-xl font-black">Quizzes for this class</h2>
                <p className="text-sm text-indigo-500">
                  Complete these quizzes for your assigned books.
                </p>
              </div>
              <ul className="mt-3 space-y-3">
                {assignedQuizzes.map((quiz: any) => {
                  const attempt = quizAttempts.get(quiz.id);
                  const isCompleted = !!attempt;
                  const dueDateLabel = quiz.due_date
                    ? `Due: ${formatDate(quiz.due_date)}`
                    : "No due date";
                  return (
                    <li
                      key={quiz.id}
                      className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 text-indigo-900 shadow-[0_10px_30px_rgba(168,85,247,0.15)] ${isCompleted
                        ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50"
                        : "border-purple-200 bg-white/90"
                        }`}
                    >
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.25em] text-purple-400">
                          {quiz.quiz_type === "checkpoint"
                            ? "Checkpoint Quiz"
                            : "Classroom Quiz"}
                        </p>
                        <p className="text-base font-semibold">
                          {quiz.books?.title ?? "Untitled"}
                        </p>
                        {isCompleted ? (
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm font-semibold text-emerald-600">
                              Score: {attempt.score}%
                            </p>
                            <p className="text-xs text-indigo-400">
                              • Completed on{" "}
                              {new Date(attempt.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-indigo-500">{dueDateLabel}</p>
                        )}
                      </div>
                      {isCompleted ? (
                        <div className="rounded-full bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-500">
                          Completed
                        </div>
                      ) : (
                        <Link
                          href={`/dashboard/student/quiz/${quiz.id}`}
                          className="rounded-full bg-gradient-to-r from-purple-500 to-pink-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                        >
                          Take quiz
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {view === "discussion" && (
        <section className="animate-in fade-in duration-500">
          <DiscussionStream
            classId={classId}
            initialMessages={messages}
            currentUserId={profileId}
          />
        </section>
      )}
    </div>
  );
}
