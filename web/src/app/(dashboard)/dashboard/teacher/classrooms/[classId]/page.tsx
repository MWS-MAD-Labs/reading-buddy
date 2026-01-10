import Link from "next/link";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth/roleCheck";
import { assertCanManageClass } from "@/lib/classrooms/permissions";
import { ClassroomRoster } from "@/components/dashboard/ClassroomRoster";
import { ClassReadingList } from "@/components/dashboard/ClassReadingList";
import { ClassQuizList } from "@/components/dashboard/ClassQuizList";
import {
  getPublishedQuizzesByBook,
  getClassQuizAssignments,
} from "@/app/(dashboard)/dashboard/teacher/actions";
import { DiscussionStream } from "@/components/dashboard/DiscussionStream";
import { getClassroomMessages } from "@/app/(dashboard)/dashboard/student/classrooms/[classId]/classroom-stream-actions";
import { MessageSquare, LayoutDashboard } from "lucide-react";

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

  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);

  await assertCanManageClass(classId, user.id, role);

  const classroomResult = await query(
    `SELECT id, name, teacher_id FROM classes WHERE id = $1`,
    [classId]
  );

  if (classroomResult.rows.length === 0) {
    console.error("Unable to load classroom", { classId });
    notFound();
  }

  const classroom = classroomResult.rows[0];

  const teacherProfileResult = await query(
    `SELECT full_name FROM profiles WHERE id = $1`,
    [classroom.teacher_id]
  );

  const teacherProfile = teacherProfileResult.rows[0] || null;

  const rosterResult = await query(
    `SELECT cs.student_id, p.full_name
     FROM class_students cs
     LEFT JOIN profiles p ON cs.student_id = p.id
     WHERE cs.class_id = $1`,
    [classId]
  );

  const classStudents = rosterResult.rows.map((row: any) => ({
    id: row.student_id,
    full_name: row.full_name ?? "Unknown student",
  }));

  const rosterStudentIds = classStudents.map((student: any) => student.id);

  let readings: {
    student_id: string;
    current_page: number | null;
    started_at: string | null;
    completed_at: string | null;
    profiles: { full_name: string | null } | null;
    books: { title: string; page_count: number | null } | null;
  }[] = [];

  if (rosterStudentIds.length > 0) {
    const readingsResult = await query(
      `SELECT 
        sb.student_id,
        sb.current_page,
        sb.started_at,
        sb.completed_at,
        p.full_name,
        b.title,
        b.page_count
       FROM student_books sb
       LEFT JOIN profiles p ON sb.student_id = p.id
       LEFT JOIN books b ON sb.book_id = b.id
       WHERE sb.student_id = ANY($1)
       ORDER BY sb.started_at DESC NULLS LAST
       LIMIT 10`,
      [rosterStudentIds]
    );

    readings = readingsResult.rows.map((row: any) => ({
      student_id: row.student_id,
      current_page: row.current_page,
      started_at: row.started_at,
      completed_at: row.completed_at,
      profiles: { full_name: row.full_name },
      books: { title: row.title, page_count: row.page_count },
    }));
  }

  let quizAttempts: {
    score: number;
    submitted_at: string | null;
    profiles: { full_name: string | null } | null;
    quizzes: { books: { title: string | null } | null } | null;
  }[] = [];

  if (rosterStudentIds.length > 0) {
    const quizAttemptsResult = await query(
      `SELECT 
        qa.score,
        qa.submitted_at,
        p.full_name,
        b.title as book_title
       FROM quiz_attempts qa
       LEFT JOIN profiles p ON qa.student_id = p.id
       LEFT JOIN quizzes q ON qa.quiz_id = q.id
       LEFT JOIN books b ON q.book_id = b.id
       WHERE qa.student_id = ANY($1)
       ORDER BY qa.submitted_at DESC
       LIMIT 10`,
      [rosterStudentIds]
    );

    quizAttempts = quizAttemptsResult.rows.map((row: any) => ({
      score: row.score,
      submitted_at: row.submitted_at,
      profiles: { full_name: row.full_name },
      quizzes: { books: { title: row.book_title } },
    }));
  }

  const studentDirectoryResult = await query(
    `SELECT id, full_name FROM profiles WHERE role = 'STUDENT'`
  );

  const studentDirectory = studentDirectoryResult.rows;

  const allAssignmentsResult = await query(
    `SELECT student_id FROM class_students`
  );

  const allAssignments = allAssignmentsResult.rows;

  const assignedIds = new Set(
    allAssignments
      .map((entry: any) => entry.student_id)
      .filter((id): id is string => Boolean(id)),
  );
  const rosterIdSet = new Set(rosterStudentIds);

  const availableStudents = studentDirectory
    .filter(
      (student: any) =>
        rosterIdSet.has(student.id) || !assignedIds.has(student.id),
    )
    .map((student: any) => ({
      id: student.id,
      full_name: student.full_name ?? "",
    }));

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

  const assignedBookRows = assignedBooksResult.rows;

  const assignedBooks = assignedBookRows.map((row: any) => ({
    book_id: row.book_id,
    title: row.title ?? "Untitled",
    author: row.author ?? null,
    cover_url: row.cover_url ?? null,
    assigned_at: row.assigned_at ?? null,
  }));

  const allBooksResult = await query(
    `SELECT id, title, author, cover_url FROM books`
  );

  const allBooksData = allBooksResult.rows;

  const availableBooks = allBooksData
    .filter(
      (book: any) =>
        !assignedBooks.some((assigned) => assigned.book_id === book.id),
    )
    .map((book: any) => ({
      id: book.id,
      title: book.title,
      author: book.author ?? null,
      cover_url: book.cover_url ?? null,
    }));

  // Get discussion messages if in discussion view
  const messages = view === "discussion" ? await getClassroomMessages(classId) : [];

  return (
    <div className="space-y-4">
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

        {/* Navigation Tabs */}
        <div className="mt-8 flex gap-2 border-b border-indigo-100 pb-1">
          <Link
            href={`/dashboard/teacher/classrooms/${classId}`}
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
            href={`/dashboard/teacher/classrooms/${classId}?view=discussion`}
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
                      readings.map((entry: any) => (
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

              {assignedBooks.map((book: any) => (
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
      )}

      {view === "discussion" && (
        <section className="animate-in fade-in duration-500">
          <DiscussionStream
            classId={classId}
            initialMessages={messages}
            currentUserId={user.id}
          />
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
    allAssignments?.filter((a: any) => a.book_id === bookId) ?? [];

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
