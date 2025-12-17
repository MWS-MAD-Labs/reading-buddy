import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Book } from "@/types/database";

export const dynamic = "force-dynamic";

const cardClass =
  "space-y-4 rounded-[28px] border border-white/70 bg-white/90 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(79,70,229,0.18)]";

export default async function StudentClassroomPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId: classIdParam } = await params;
  const classId = Number.parseInt(classIdParam, 10);

  if (Number.isNaN(classId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ensure the current user belongs to this class
  const { data: membership } = await supabaseAdmin
    .from("class_students")
    .select("class_id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  // Load classroom details
  const { data: classroom } = await supabaseAdmin
    .from("classes")
    .select("id, name, profiles!classes_teacher_id_fkey(full_name)")
    .eq("id", classId)
    .maybeSingle();

  if (!classroom) {
    notFound();
  }

  const teacherProfileData =
    Array.isArray(classroom.profiles) && classroom.profiles.length > 0
      ? classroom.profiles[0]
      : classroom.profiles;
  const teacherProfile = teacherProfileData as {
    full_name: string | null;
  } | null;

  // Load assigned books for this classroom
  const { data: assignedBookRows } = await supabaseAdmin
    .from("class_books")
    .select("book_id, assigned_at, books(id, title, author, cover_url)")
    .eq("class_id", classId)
    .order("assigned_at", { ascending: false });

  const assignedBooks =
    assignedBookRows?.map(
      (entry: {
        book_id: number;
        assigned_at: string;
        books:
          | {
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
            }
          | {
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
            }[]
          | null;
      }) => {
        const bookData =
          Array.isArray(entry.books) && entry.books.length > 0
            ? entry.books[0]
            : entry.books;
        const book = bookData as Pick<
          Book,
          "id" | "title" | "author" | "cover_url"
        > | null;
        return {
          book_id: entry.book_id,
          id: book?.id ?? entry.book_id,
          title: book?.title ?? "Untitled",
          author: book?.author ?? null,
          cover_url: book?.cover_url ?? null,
          assigned_at: entry.assigned_at ?? null,
        };
      },
    ) ?? [];

  // Get student's reading progress for these books
  const bookIds = assignedBooks.map((b: any) => b.book_id);
  const readingProgress: Map<number, { current_page: number }> = new Map();
  if (bookIds.length > 0) {
    const { data: progress } = await supabaseAdmin
      .from("student_books")
      .select("book_id, current_page")
      .eq("student_id", user.id)
      .in("book_id", bookIds);

    progress?.forEach((p: { book_id: number; current_page: number }) => {
      readingProgress.set(p.book_id, {
        current_page: p.current_page,
      });
    });
  }

  // Load quizzes assigned to this classroom
  const { data: quizAssignments } = await supabaseAdmin
    .from("class_quiz_assignments")
    .select("quiz_id, due_date, quizzes(id, book_id, quiz_type, books(title))")
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  const assignedQuizzes =
    quizAssignments?.map(
      (item: {
        quiz_id: number;
        due_date: string | null;
        quizzes:
          | {
              id?: number;
              book_id?: number;
              quiz_type?: string;
              books?:
                | { title: string | null }
                | { title: string | null }[]
                | null;
            }
          | Array<{
              id?: number;
              book_id?: number;
              quiz_type?: string;
              books?:
                | { title: string | null }
                | { title: string | null }[]
                | null;
            }>
          | null;
      }) => {
        const quizData =
          Array.isArray(item.quizzes) && item.quizzes.length > 0
            ? item.quizzes[0]
            : item.quizzes;

        const resolvedQuiz = quizData as {
          id?: number;
          book_id?: number;
          quiz_type?: string;
          books?: { title: string | null } | { title: string | null }[] | null;
        } | null;

        const booksField = resolvedQuiz?.books;
        const bookData =
          Array.isArray(booksField) && booksField.length > 0
            ? booksField[0]
            : !Array.isArray(booksField)
              ? booksField
              : null;

        return {
          id: resolvedQuiz?.id ?? 0,
          book_id: resolvedQuiz?.book_id ?? 0,
          quiz_type: resolvedQuiz?.quiz_type ?? "classroom",
          books: bookData ? { title: bookData.title ?? "Untitled" } : null,
          due_date: item.due_date as string | null,
        };
      },
    ) ?? [];

  // Get quiz attempts to check which quizzes have been taken
  const quizIds = assignedQuizzes.map((q: any) => q.id);
  const quizAttempts: Map<number, { score: number; submitted_at: string }> =
    new Map();
  if (quizIds.length > 0) {
    const { data: attempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("quiz_id, score, submitted_at")
      .eq("student_id", user.id)
      .in("quiz_id", quizIds);

    attempts?.forEach(
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

  return (
    <div className="space-y-8">
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
      </section>

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
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 text-indigo-900 shadow-[0_10px_30px_rgba(168,85,247,0.15)] ${
                    isCompleted
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
  );
}
