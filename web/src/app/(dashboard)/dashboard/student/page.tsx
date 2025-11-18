import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get student's current readings (personal progress)
  const { data: assignments } = await supabase
    .from("student_books")
    .select("book_id, current_page, books(*)")
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  const assignedBookIds =
    assignments?.map((assignment) => assignment.book_id) ?? [];

  // Get student's classes (via admin client to avoid RLS issues)
  const { data: studentClasses } = await supabaseAdmin
    .from("class_students")
    .select("class_id")
    .eq("student_id", user.id);

  const classIds = studentClasses?.map((c) => c.class_id) ?? [];

  // Get classroom details for the student
  let classrooms: Array<{
    id: number;
    name: string;
    teacher_name: string;
  }> = [];

  if (classIds.length > 0) {
    const { data: classRows } = await supabaseAdmin
      .from("classes")
      .select("id, name, profiles!classes_teacher_id_fkey(full_name)")
      .in("id", classIds);

    classrooms =
      classRows?.map((entry: any) => {
        const profileData =
          Array.isArray(entry.profiles) && entry.profiles.length > 0
            ? entry.profiles[0]
            : entry.profiles;
        const profile = profileData as { full_name: string | null } | null;

        return {
          id: entry.id,
          name: entry.name,
          teacher_name: profile?.full_name ?? "Unknown teacher",
        };
      }) ?? [];
  }

  // Get quizzes assigned to student's classes
  let assignedQuizzes: Array<{
    id: number;
    book_id: number;
    books: { title: string } | null;
    due_date: string | null;
    quiz_type: string;
  }> = [];

  if (classIds.length > 0) {
    const { data: classQuizData } = await supabase
      .from("class_quiz_assignments")
      .select(
        "quiz_id, due_date, quizzes(id, book_id, quiz_type, books(title))",
      )
      .in("class_id", classIds)
      .eq("is_active", true)
      .order("due_date", { ascending: true, nullsFirst: false });

    assignedQuizzes = (classQuizData ?? []).map((item: any) => {
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
        due_date: item.due_date,
      };
    });
  }

  // Get all available quizzes for assigned books (legacy support)
  let quizzes: Array<{
    id: number;
    book_id: number;
    books: { title: string } | null;
  }> = [];
  if (assignedBookIds.length) {
    const { data } = await supabase
      .from("quizzes")
      .select("id, book_id, books(title)")
      .in("book_id", assignedBookIds)
      .order("created_at", { ascending: false });
    // Transform the data to match the expected type
    quizzes = (data ?? []).map((item: any) => ({
      id: item.id,
      book_id: item.book_id,
      books:
        Array.isArray(item.books) && item.books.length > 0
          ? item.books[0]
          : null,
    }));
  }

  const { data: achievements } = await supabase
    .from("student_achievements")
    .select("earned_at, achievements(name, description, badge_url)")
    .eq("student_id", user.id)
    .order("earned_at", { ascending: false });

  return (
    <div className="space-y-8">
      <header className="space-y-2 rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(147,118,255,0.25)]">
        <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
          Student zone
        </p>
        <h1 className="text-3xl font-black">My readings</h1>
        <p className="text-sm text-indigo-500">Pick up where you left off.</p>
      </header>

      {assignments?.length ? (
        <ul className="grid gap-5 md:grid-cols-2">
          {assignments.map((assignment) => {
            // Extract first book from array if it exists
            const bookData =
              Array.isArray(assignment.books) && assignment.books.length > 0
                ? assignment.books[0]
                : assignment.books;
            const book = bookData as {
              id: number;
              title: string;
              author: string;
              cover_url: string;
            } | null;
            return (
              <li
                key={assignment.book_id}
                className="rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-pink-50 to-amber-50 p-5 text-indigo-900 shadow-[0_15px_50px_rgba(255,158,197,0.3)]"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-wide text-rose-400">
                    Assigned reading
                  </p>
                  <h2 className="text-xl font-black text-indigo-950">
                    {book?.title ?? "Unknown title"}
                  </h2>
                  <p className="text-sm text-indigo-500">{book?.author}</p>
                  <p className="text-xs text-indigo-400">
                    Current page: {assignment.current_page ?? 1}
                  </p>
                  <Link
                    href={`/dashboard/student/read/${assignment.book_id}`}
                    className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                  >
                    Continue reading →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-[28px] border border-dashed border-indigo-200 bg-white/80 p-8 text-center text-indigo-500">
          No books in progress yet. Once you start reading, your books will show
          up here.
        </div>
      )}

      <section className="space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black">My classrooms</h2>
            <p className="text-sm text-indigo-500">
              Jump into your class to see assigned books and quizzes.
            </p>
          </div>
        </div>
        {classrooms.length ? (
          <ul className="space-y-3">
            {classrooms.map((classroom) => (
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

      <section className="space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
        <div>
          <h2 className="text-xl font-black">Achievements</h2>
          <p className="text-sm text-indigo-500">
            Badges unlocked from finished readings.
          </p>
        </div>
        {achievements?.length ? (
          <ul className="space-y-3">
            {achievements.map((achievement, index) => {
              // Extract first achievement from array if it exists
              const achievementData =
                Array.isArray(achievement.achievements) &&
                achievement.achievements.length > 0
                  ? achievement.achievements[0]
                  : achievement.achievements;
              const data = achievementData as {
                name: string;
                description: string;
              } | null;
              return (
                <li
                  key={`${data?.name ?? "achievement"}-${index}`}
                  className="rounded-2xl border border-indigo-100 bg-white/70 p-4 text-sm text-indigo-900"
                >
                  <p className="font-semibold">
                    {data?.name ?? "Unlocked badge"}
                  </p>
                  <p className="text-indigo-500">{data?.description}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-indigo-400">
            No badges yet. Finish books to unlock awards.
          </p>
        )}
      </section>

      {assignedQuizzes.length > 0 && (
        <section className="space-y-3 rounded-[28px] border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(168,85,247,0.25)]">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1">
              <span className="text-lg">📝</span>
              <p className="text-xs font-black uppercase tracking-wide text-purple-600">
                Assigned by Teacher
              </p>
            </div>
            <h2 className="text-xl font-black">Required Quizzes</h2>
            <p className="text-sm text-indigo-500">
              Complete these quizzes assigned by your teacher.
            </p>
          </div>
          <ul className="space-y-3">
            {assignedQuizzes.map((quiz) => {
              const formatDueDate = (dateString: string | null) => {
                if (!dateString) return null;
                const date = new Date(dateString);
                const now = new Date();
                const isOverdue = date < now;
                const dateStr = date.toLocaleDateString();
                return { dateStr, isOverdue };
              };
              const dueInfo = formatDueDate(quiz.due_date);

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
                    {dueInfo && (
                      <p
                        className={`text-xs font-medium ${
                          dueInfo.isOverdue
                            ? "text-rose-500"
                            : "text-indigo-500"
                        }`}
                      >
                        {dueInfo.isOverdue ? "⚠️ Overdue" : "📅 Due"}:{" "}
                        {dueInfo.dateStr}
                      </p>
                    )}
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

      <section className="space-y-3 rounded-[28px] border border-white/70 bg-white/85 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
        <div>
          <h2 className="text-xl font-black">Available quizzes</h2>
          <p className="text-sm text-indigo-500">
            Test your knowledge on completed readings.
          </p>
        </div>
        {quizzes.length ? (
          <ul className="space-y-3">
            {quizzes.map((quiz) => (
              <li
                key={quiz.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-white/70 p-4 text-indigo-900"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">
                    Book
                  </p>
                  <p className="text-base font-semibold">
                    {quiz.books?.title ?? "Untitled"}
                  </p>
                </div>
                <Link
                  href={`/dashboard/student/quiz/${quiz.id}`}
                  className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                >
                  Take quiz
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-indigo-400">
            No quizzes yet. Librarians or teachers can generate them anytime.
          </p>
        )}
      </section>
    </div>
  );
}
