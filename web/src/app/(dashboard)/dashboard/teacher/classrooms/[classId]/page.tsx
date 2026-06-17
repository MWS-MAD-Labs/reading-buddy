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
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const tableWrapperClass =
  "overflow-x-auto rounded-3xl border border-[#eadfda] bg-white/85";
const tableClass =
  "min-w-full divide-y divide-[#eadfda] text-sm text-[#241718]";
const headClass = "bg-[#fffaf4] text-xs uppercase tracking-wide text-[#7E1518]";
const cellClass = "px-4 py-3";

type View = "overview" | "quizzes" | "discussion";

type ClassroomRow = {
  id: number;
  name: string;
  teacher_id: string;
};

type ProfileNameRow = {
  full_name: string | null;
};

type RosterRow = {
  student_id: string;
  full_name: string | null;
};

type ReadingRow = {
  student_id: string;
  current_page: number | null;
  started_at: string | null;
  completed_at: string | null;
  full_name: string | null;
  title: string | null;
  page_count: number | null;
};

type QuizAttemptRow = {
  score: number;
  submitted_at: string | null;
  full_name: string | null;
  book_title: string | null;
};

type StudentDirectoryRow = {
  id: string;
  full_name: string | null;
};

type AssignmentRow = {
  student_id: string | null;
};

type AssignedBookRow = {
  book_id: number;
  assigned_at: string | null;
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

type BookRow = {
  id: number;
  title: string;
  author: string | null;
  cover_url: string | null;
};

type ClassQuizAssignment = {
  book_id: number;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
};

const tabClass = (active: boolean) =>
  buttonVariants({ variant: active ? "primary" : "neutral", size: "sm" });

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
  const view: View =
    viewParam === "discussion"
      ? "discussion"
      : viewParam === "quizzes"
        ? "quizzes"
        : "overview";

  if (Number.isNaN(classId)) {
    notFound();
  }

  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);

  await assertCanManageClass(classId, user.id, role);

  const classroomResult = await query(
    `SELECT id, name, teacher_id FROM classes WHERE id = $1`,
    [classId],
  );

  if (classroomResult.rows.length === 0) {
    console.error("Unable to load classroom", { classId });
    notFound();
  }

  const classroom = classroomResult.rows[0] as ClassroomRow;

  const teacherProfileResult = await query(
    `SELECT full_name FROM profiles WHERE id = $1`,
    [classroom.teacher_id],
  );

  const teacherProfile =
    (teacherProfileResult.rows[0] as ProfileNameRow | undefined) || null;

  const rosterResult = await query(
    `SELECT cs.student_id, p.full_name
     FROM class_students cs
     LEFT JOIN profiles p ON cs.student_id = p.id
     WHERE cs.class_id = $1`,
    [classId],
  );

  const classStudents = (rosterResult.rows as RosterRow[]).map((row) => ({
    id: row.student_id,
    full_name: row.full_name ?? "Unknown student",
  }));

  const rosterStudentIds = classStudents.map((student) => student.id);

  let readings: {
    student_id: string;
    current_page: number | null;
    started_at: string | null;
    completed_at: string | null;
    profiles: { full_name: string | null } | null;
    books: { title: string | null; page_count: number | null } | null;
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
      [rosterStudentIds],
    );

    readings = (readingsResult.rows as ReadingRow[]).map((row) => ({
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
      [rosterStudentIds],
    );

    quizAttempts = (quizAttemptsResult.rows as QuizAttemptRow[]).map((row) => ({
      score: row.score,
      submitted_at: row.submitted_at,
      profiles: { full_name: row.full_name },
      quizzes: { books: { title: row.book_title } },
    }));
  }

  const studentDirectoryResult = await query(
    `SELECT id, full_name FROM profiles WHERE role = 'STUDENT'`,
  );

  const studentDirectory = studentDirectoryResult.rows as StudentDirectoryRow[];

  const allAssignmentsResult = await query(
    `SELECT student_id FROM class_students`,
  );

  const allAssignments = allAssignmentsResult.rows as AssignmentRow[];

  const assignedIds = new Set(
    allAssignments
      .map((entry) => entry.student_id)
      .filter((id): id is string => Boolean(id)),
  );
  const rosterIdSet = new Set(rosterStudentIds);

  const availableStudents = studentDirectory
    .filter(
      (student) => rosterIdSet.has(student.id) || !assignedIds.has(student.id),
    )
    .map((student) => ({
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
    [classId],
  );

  const assignedBookRows = assignedBooksResult.rows as AssignedBookRow[];

  const assignedBooks = assignedBookRows.map((row) => ({
    book_id: row.book_id,
    title: row.title ?? "Untitled",
    author: row.author ?? null,
    cover_url: row.cover_url ?? null,
    assigned_at: row.assigned_at ?? null,
  }));

  const allBooksResult = await query(
    `SELECT id, title, author, cover_url FROM books`,
  );

  const allBooksData = allBooksResult.rows as BookRow[];

  const availableBooks = allBooksData
    .filter(
      (book) => !assignedBooks.some((assigned) => assigned.book_id === book.id),
    )
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author ?? null,
      cover_url: book.cover_url ?? null,
    }));

  const messages =
    view === "discussion" ? await getClassroomMessages(classId) : [];

  return (
    <div className="space-y-8">
      <Card variant="glow" padding="cozy">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <CardHeader className="mb-0">
            <Badge variant="bubble">Manage classroom</Badge>
            <h1 className="heading-font mt-2 text-3xl font-bold leading-tight text-[#241718] md:text-4xl">
              {classroom.name}
            </h1>
            <CardDescription>
              Mentor: {teacherProfile?.full_name ?? "Unknown teacher"}
            </CardDescription>
          </CardHeader>
          <Link
            href="/dashboard/teacher"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-[#eadfda] pt-5">
          <Link
            href={`/dashboard/teacher/classrooms/${classId}`}
            className={tabClass(view === "overview")}
          >
            Overview
          </Link>
          <Link
            href={`/dashboard/teacher/classrooms/${classId}?view=quizzes`}
            className={tabClass(view === "quizzes")}
          >
            Quizzes
          </Link>
          <Link
            href={`/dashboard/teacher/classrooms/${classId}?view=discussion`}
            className={tabClass(view === "discussion")}
          >
            Discussion
          </Link>
        </div>
      </Card>

      {view === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className="grid gap-6 lg:grid-cols-2">
            <Card variant="frosted" padding="cozy">
              <CardHeader>
                <Badge variant="sky">Student progress</Badge>
                <CardTitle>Reading updates</CardTitle>
                <CardDescription>
                  Latest progress from this classroom only.
                </CardDescription>
              </CardHeader>
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
                  <tbody className="divide-y divide-[#eadfda]">
                    {readings.length > 0 ? (
                      readings.map((entry) => (
                        <tr
                          key={`${entry.student_id}-${entry.books?.title ?? "book"}`}
                        >
                          <td className={cellClass}>
                            {entry.profiles?.full_name ?? "Unknown student"}
                          </td>
                          <td className={cellClass}>
                            {entry.books?.title ?? "—"}
                          </td>
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
                          className={`${cellClass} text-center text-[#6f6061]`}
                        >
                          No updates yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card variant="frosted" padding="cozy">
              <CardHeader>
                <Badge variant="amber">Quiz tracker</Badge>
                <CardTitle>Recent quiz attempts</CardTitle>
                <CardDescription>
                  See how this class is performing.
                </CardDescription>
              </CardHeader>
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
                  <tbody className="divide-y divide-[#eadfda]">
                    {quizAttempts.length > 0 ? (
                      quizAttempts.map((attempt, index) => (
                        <tr key={index}>
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
                          className={`${cellClass} text-center text-[#6f6061]`}
                        >
                          No attempts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <ClassroomRoster
            classId={classId}
            students={classStudents}
            allStudents={availableStudents}
          />

          <ClassReadingList
            classId={classId}
            assignedBooks={assignedBooks}
            availableBooks={availableBooks}
          />
        </div>
      )}

      {view === "quizzes" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card variant="playful" padding="cozy">
            <CardHeader className="mb-0">
              <Badge variant="amber">Quiz management</Badge>
              <CardTitle>Create and assign quizzes</CardTitle>
              <CardDescription>
                Create AI-generated quizzes or assign existing quizzes to your
                class.
              </CardDescription>
            </CardHeader>
          </Card>

          {assignedBooks.length > 0 ? (
            <div className="space-y-4">
              {assignedBooks.map((book) => (
                <BookQuizSection
                  key={book.book_id}
                  classId={classId}
                  bookId={book.book_id}
                  bookTitle={book.title}
                />
              ))}
            </div>
          ) : (
            <Card padding="cozy" className="border-dashed text-center">
              <CardTitle className="text-lg">No books assigned</CardTitle>
              <CardDescription>
                Assign books to your class first to create quizzes for them.
              </CardDescription>
            </Card>
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
  const availableQuizzes = await getPublishedQuizzesByBook(bookId);
  const allAssignments = await getClassQuizAssignments(classId);
  const assignedQuizzes =
    allAssignments?.filter(
      (assignment: ClassQuizAssignment) => assignment.book_id === bookId,
    ) ?? [];

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
