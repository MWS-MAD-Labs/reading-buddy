import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
    assignedBookRows?.map((entry: any) => {
      const bookData =
        Array.isArray(entry.books) && entry.books.length > 0
          ? entry.books[0]
          : entry.books;
      const book = bookData as {
        id: number;
        title: string;
        author: string | null;
        cover_url: string | null;
      } | null;
      return {
        book_id: entry.book_id,
        id: book?.id ?? entry.book_id,
        title: book?.title ?? "Untitled",
        author: book?.author ?? null,
        cover_url: book?.cover_url ?? null,
        assigned_at: entry.assigned_at ?? null,
      };
    }) ?? [];

  // Load quizzes assigned to this classroom
  const { data: quizAssignments } = await supabaseAdmin
    .from("class_quiz_assignments")
    .select("quiz_id, due_date, quizzes(id, book_id, quiz_type, books(title))")
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  const assignedQuizzes =
    quizAssignments?.map((item: any) => {
      const quizData =
        Array.isArray(item.quizzes) && item.quizzes.length > 0
          ? item.quizzes[0]
          : item.quizzes;
      const bookData =
        quizData?.books &&
        Array.isArray(quizData.books) &&
        quizData.books.length > 0
          ? quizData.books[0]
          : quizData?.books;

      return {
        id: quizData?.id ?? 0,
        book_id: quizData?.book_id ?? 0,
        quiz_type: quizData?.quiz_type ?? "classroom",
        books: bookData ? { title: bookData.title } : null,
        due_date: item.due_date as string | null,
      };
    }) ?? [];

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
          <ul className="mt-2 grid gap-4 md:grid-cols-2">
            {assignedBooks.map((book) => (
              <li
                key={book.book_id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/90 p-4 shadow-[0_16px_40px_rgba(79,70,229,0.15)]"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">
                    Assigned book
                  </p>
                  <p className="text-base font-semibold text-indigo-900">
                    {book.title}
                  </p>
                  <p className="text-sm text-indigo-500">
                    {book.author ?? "Unknown author"}
                  </p>
                  {book.assigned_at && (
                    <p className="mt-1 text-xs text-indigo-400">
                      Assigned: {formatDate(book.assigned_at)}
                    </p>
                  )}
                </div>
                <div>
                  <Link
                    href={`/dashboard/student/read/${book.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                  >
                    Start reading →
                  </Link>
                </div>
              </li>
            ))}
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
              <span className="text-lg">📝</span>
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
            {assignedQuizzes.map((quiz) => {
              const dueDateLabel = quiz.due_date
                ? `Due: ${formatDate(quiz.due_date)}`
                : "No due date";
              return (
                <li
                  key={quiz.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-200 bg-white/90 p-4 text-indigo-900 shadow-[0_10px_30px_rgba(168,85,247,0.15)]"
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
                    <p className="text-xs text-indigo-500">{dueDateLabel}</p>
                  </div>
                  <Link
                    href={`/dashboard/student/quiz/${quiz.id}`}
                    className="rounded-full bg-gradient-to-r from-purple-500 to-pink-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                  >
                    Take quiz
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
