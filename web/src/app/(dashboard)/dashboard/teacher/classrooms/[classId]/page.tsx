import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/roleCheck";
import { assertCanManageClass } from "@/lib/classrooms/permissions";
import { ClassroomRoster } from "@/components/dashboard/ClassroomRoster";
import { ClassReadingList } from "@/components/dashboard/ClassReadingList";
import { ClassQuizList } from "@/components/dashboard/ClassQuizList";
import {
  getPublishedQuizzesByBook,
  getClassQuizAssignments,
} from "@/app/(dashboard)/dashboard/teacher/actions";

export const dynamic = "force-dynamic";

const tableWrapperClass =
  "overflow-x-auto rounded-3xl border border-white/70 bg-white/85 shadow-[inset_0_10px_40px_rgba(79,70,229,0.08)]";
const tableClass =
  "min-w-full divide-y divide-indigo-50 text-sm text-indigo-900";
const headClass =
  "bg-gradient-to-r from-indigo-50 to-pink-50 text-xs uppercase tracking-wide text-indigo-500";
const cellClass = "px-4 py-3";

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
};

export default async function ManageClassroomPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId: classIdParam } = await params;
  const classId = Number.parseInt(classIdParam, 10);
  if (Number.isNaN(classId)) {
    notFound();
  }

  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabaseAdmin = getSupabaseAdminClient();

  await assertCanManageClass(classId, user.id, role);

  const { data: classroom, error: classroomError } = await supabaseAdmin
    .from("classes")
    .select("id, name, teacher_id")
    .eq("id", classId)
    .single();

  if (classroomError || !classroom) {
    console.error("Unable to load classroom", { classroomError, classId });
    notFound();
  }

  const { data: teacherProfile, error: teacherProfileError } =
    await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", classroom.teacher_id)
      .maybeSingle();

  if (teacherProfileError) {
    console.error("Unable to load teacher profile", teacherProfileError);
  }

  const { data: rosterData, error: rosterError } = await supabaseAdmin
    .from("class_students")
    .select("student_id, profiles(full_name)")
    .eq("class_id", classId);

  if (rosterError) {
    console.error(rosterError);
  }

  const classStudents =
    rosterData?.map((entry) => {
      const profileData =
        Array.isArray(entry.profiles) && entry.profiles.length > 0
          ? entry.profiles[0]
          : entry.profiles;
      const profile = profileData as { full_name: string | null } | null;
      return {
        id: entry.student_id,
        full_name: profile?.full_name ?? "Unknown student",
      };
    }) ?? [];

  const rosterStudentIds = classStudents.map((student) => student.id);

  let readings: {
    student_id: string;
    current_page: number | null;
    started_at: string | null;
    completed_at: string | null;
    profiles: { full_name: string | null } | null;
    books: { title: string; page_count: number | null } | null;
  }[] = [];

  if (rosterStudentIds.length > 0) {
    const { data: readingsData, error: readingsError } = await supabaseAdmin
      .from("student_books")
      .select(
        "student_id, current_page, started_at, completed_at, profiles!student_books_student_id_fkey(full_name), books(title, page_count)",
      )
      .in("student_id", rosterStudentIds)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(10);

    if (readingsError) {
      console.error(readingsError);
    }

    // Transform array relationships to single objects
    readings = (readingsData ?? []).map((entry: any) => {
      const profileData =
        Array.isArray(entry.profiles) && entry.profiles.length > 0
          ? entry.profiles[0]
          : entry.profiles;
      const bookData =
        Array.isArray(entry.books) && entry.books.length > 0
          ? entry.books[0]
          : entry.books;
      return {
        ...entry,
        profiles: profileData as { full_name: string | null } | null,
        books: bookData as { title: string; page_count: number | null } | null,
      };
    });
  }

  let quizAttempts: {
    score: number;
    submitted_at: string | null;
    profiles: { full_name: string | null } | null;
    quizzes: { books: { title: string | null } | null } | null;
  }[] = [];

  if (rosterStudentIds.length > 0) {
    const { data: quizData, error: quizError } = await supabaseAdmin
      .from("quiz_attempts")
      .select(
        "score, submitted_at, profiles!quiz_attempts_student_id_fkey(full_name), quizzes(id, books(title))",
      )
      .in("student_id", rosterStudentIds)
      .order("submitted_at", { ascending: false })
      .limit(10);

    if (quizError) {
      console.error(quizError);
    }

    // Transform nested array relationships (profiles, quizzes.books) to single objects
    quizAttempts = (quizData ?? []).map((entry: any) => {
      const profileData =
        Array.isArray(entry.profiles) && entry.profiles.length > 0
          ? entry.profiles[0]
          : entry.profiles;

      const quizData =
        Array.isArray(entry.quizzes) && entry.quizzes.length > 0
          ? entry.quizzes[0]
          : entry.quizzes;
      const quiz = quizData as { id?: number; books?: any } | null;

      const bookData =
        quiz && Array.isArray(quiz.books) && quiz.books.length > 0
          ? quiz.books[0]
          : quiz?.books;

      return {
        ...entry,
        profiles: profileData as { full_name: string | null } | null,
        quizzes: quiz
          ? {
              books: bookData as { title: string | null } | null,
            }
          : null,
      };
    });
  }

  const { data: studentDirectory, error: studentDirectoryError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("role", "STUDENT");

  if (studentDirectoryError) {
    console.error(studentDirectoryError);
  }

  const { data: allAssignments, error: assignmentsError } = await supabaseAdmin
    .from("class_students")
    .select("student_id");

  if (assignmentsError) {
    console.error(assignmentsError);
  }

  const assignedIds = new Set(
    (allAssignments ?? [])
      .map((entry) => entry.student_id)
      .filter((id): id is string => Boolean(id)),
  );
  const rosterIdSet = new Set(rosterStudentIds);

  const availableStudents =
    studentDirectory
      ?.filter(
        (student) =>
          rosterIdSet.has(student.id) || !assignedIds.has(student.id),
      )
      .map((student) => ({
        id: student.id,
        full_name: student.full_name ?? "",
      })) ?? [];

  const { data: assignedBookRows, error: assignedBooksError } =
    await supabaseAdmin
      .from("class_books")
      .select("book_id, assigned_at, books(id, title, author, cover_url)")
      .eq("class_id", classId)
      .order("assigned_at", { ascending: false });

  if (assignedBooksError) {
    console.error(assignedBooksError);
  }

  const assignedBooks =
    assignedBookRows?.map((entry) => {
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
        title: book?.title ?? "Untitled",
        author: book?.author ?? null,
        cover_url: book?.cover_url ?? null,
        assigned_at: entry.assigned_at ?? null,
      };
    }) ?? [];

  const { data: allBooksData, error: allBooksError } = await supabaseAdmin
    .from("books")
    .select("id, title, author, cover_url");

  if (allBooksError) {
    console.error(allBooksError);
  }

  const availableBooks =
    allBooksData
      ?.filter(
        (book) =>
          !assignedBooks.some((assigned) => assigned.book_id === book.id),
      )
      .map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author ?? null,
        cover_url: book.cover_url ?? null,
      })) ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_rgba(147,118,255,0.2)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">
              Manage Classroom
            </p>
            <h1 className="text-3xl font-black text-indigo-950">
              {classroom.name}
            </h1>
            <p className="text-sm font-medium text-indigo-500">
              Mentor: {teacherProfile?.full_name ?? "Unknown teacher"}
            </p>
          </div>
          <Link
            href="/dashboard/teacher"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(255,173,109,0.45)] transition hover:opacity-90"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(79,70,229,0.18)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
              Student Progress
            </p>
            <h2 className="text-xl font-black text-indigo-950">
              Reading updates
            </h2>
            <p className="text-sm text-indigo-500">
              Latest progress from this classroom only.
            </p>
          </div>
          <div className={tableWrapperClass}>
            <table className={tableClass}>
              <thead className={headClass}>
                <tr>
                  <th className={cellClass}>Student</th>
                  <th className={cellClass}>Book</th>
                  <th className={cellClass}>Current page</th>
                  <th className={cellClass}>Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {readings.length > 0 ? (
                  readings.map((entry) => (
                    <tr
                      key={`${entry.student_id}-${entry.books?.title ?? "book"}`}
                      className="hover:bg-indigo-50/60"
                    >
                      <td className={cellClass}>
                        {entry.profiles?.full_name ?? "Unknown student"}
                      </td>
                      <td className={cellClass}>{entry.books?.title ?? "—"}</td>
                      <td className={cellClass}>
                        {entry.current_page ?? 0} /{" "}
                        {entry.books?.page_count ?? "—"}
                      </td>
                      <td className={cellClass}>
                        {formatDate(entry.completed_at ?? entry.started_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className={`${cellClass} text-center text-indigo-400`}
                    >
                      No updates yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(16,185,129,0.18)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">
              Quiz tracker
            </p>
            <h2 className="text-xl font-black text-indigo-950">
              Recent quiz attempts
            </h2>
            <p className="text-sm text-indigo-500">
              See how this class is performing.
            </p>
          </div>
          <div className={tableWrapperClass}>
            <table className={tableClass}>
              <thead className={headClass}>
                <tr>
                  <th className={cellClass}>Student</th>
                  <th className={cellClass}>Book</th>
                  <th className={cellClass}>Score</th>
                  <th className={cellClass}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {quizAttempts.length > 0 ? (
                  quizAttempts.map((attempt, index) => (
                    <tr key={index} className="hover:bg-indigo-50/60">
                      <td className={cellClass}>
                        {attempt.profiles?.full_name ?? "Unknown student"}
                      </td>
                      <td className={cellClass}>
                        {attempt.quizzes?.books?.title ?? "—"}
                      </td>
                      <td className={cellClass}>{attempt.score}%</td>
                      <td className={cellClass}>
                        {formatDate(attempt.submitted_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className={`${cellClass} text-center text-indigo-400`}
                    >
                      No attempts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_rgba(255,173,109,0.2)]">
        <ClassroomRoster
          classId={classId}
          students={classStudents}
          allStudents={availableStudents}
        />
      </section>

      <ClassReadingList
        classId={classId}
        assignedBooks={assignedBooks}
        availableBooks={availableBooks}
      />

      {assignedBooks.length > 0 && (
        <section className="space-y-6">
          <div className="rounded-[32px] border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1">
              <span className="text-lg">📝</span>
              <p className="text-xs font-black uppercase tracking-wide text-purple-600">
                Quiz Assignments
              </p>
            </div>
            <h2 className="text-xl font-black text-indigo-950">
              Assign Quizzes to Class
            </h2>
            <p className="text-sm text-indigo-500">
              Assign quizzes created by librarians for each book below.
            </p>
          </div>

          {assignedBooks.map((book) => (
            <BookQuizSection
              key={book.book_id}
              classId={classId}
              bookId={book.book_id}
              bookTitle={book.title}
            />
          ))}
        </section>
      )}
    </div>
  );
}

async function BookQuizSection({
  classId,
  bookId,
  bookTitle,
}: {
  classId: number;
  bookId: number;
  bookTitle: string;
}) {
  // Fetch available quizzes for this book
  const availableQuizzes = await getPublishedQuizzesByBook(bookId);

  // Fetch assigned quizzes for this class
  const allAssignments = await getClassQuizAssignments(classId);
  const assignedQuizzes =
    allAssignments?.filter((a) => a.book_id === bookId) ?? [];

  return (
    <ClassQuizList
      classId={classId}
      bookId={bookId}
      bookTitle={bookTitle}
      availableQuizzes={availableQuizzes}
      assignedQuizzes={assignedQuizzes}
    />
  );
}
