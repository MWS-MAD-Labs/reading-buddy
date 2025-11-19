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
  const { data: assignments, error: assignmentsError } = await supabase
    .from("student_books")
    .select("book_id, current_page, books(*)")
    .eq("student_id", user.id)
    .order("started_at", { ascending: false });

  // Debug logging
  console.log("Student ID:", user.id);
  console.log("Assignments query result:", {
    count: assignments?.length ?? 0,
    data: assignments,
    error: assignmentsError,
  });

  const assignedBookIds =
    assignments?.map((assignment) => assignment.book_id) ?? [];

  // Get student's classes (via admin client to avoid RLS issues)
  const { data: studentClasses } = await supabaseAdmin
    .from("class_students")
    .select("class_id")
    .eq("student_id", user.id);

  const classIds = studentClasses?.map((c) => c.class_id) ?? [];

  // Get which classrooms assigned each book (for display purposes)
  let bookClassrooms: Map<number, string[]> = new Map();
  if (classIds.length > 0 && assignedBookIds.length > 0) {
    const { data: classBookData } = await supabaseAdmin
      .from("class_books")
      .select("book_id, class_id, classes(name)")
      .in("class_id", classIds)
      .in("book_id", assignedBookIds);

    classBookData?.forEach((item: any) => {
      const className = item.classes?.name ?? "Unknown class";
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
                      Assigned reading
                      {bookClassrooms.has(assignment.book_id) &&
                        bookClassrooms.get(assignment.book_id)!.length > 0 && (
                          <span className="ml-2 font-normal">
                            •{" "}
                            {bookClassrooms.get(assignment.book_id)!.join(", ")}
                          </span>
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
                      Continue reading →
                    </Link>
                  </div>
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
    </div>
  );
}
