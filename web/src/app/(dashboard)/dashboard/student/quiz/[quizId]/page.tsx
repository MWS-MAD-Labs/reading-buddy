import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuizPlayer } from "@/components/dashboard/QuizPlayer";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ quizId: string }>;
  searchParams?: Promise<{ page?: string; bookId?: string }>;
};

type QuizPayload = {
  title?: string;
  questions: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation?: string;
  }[];
};

export default async function StudentQuizPage({
  params,
  searchParams,
}: PageProps) {
  const awaitedSearchParams = searchParams ? await searchParams : undefined;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { quizId: quizIdParam } = await params;
  const quizId = Number(quizIdParam);
  if (Number.isNaN(quizId)) {
    notFound();
  }

  // Fetch quiz from PostgreSQL
  const quizResult = await query(
    `SELECT id, book_id, questions FROM quizzes WHERE id = $1`,
    [quizId],
  );

  if (quizResult.rows.length === 0) {
    console.error("Quiz not found:", quizId);
    notFound();
  }

  const quiz = quizResult.rows[0];

  // Fetch book title
  const bookResult = await query(`SELECT title FROM books WHERE id = $1`, [
    quiz.book_id,
  ]);

  const book = bookResult.rows.length > 0 ? bookResult.rows[0] : null;

  // Find which classroom this quiz belongs to (for redirect after completion)
  let quizAssignment: { class_id: number } | null = null;
  try {
    const assignmentResult = await query(
      `SELECT class_id FROM class_quiz_assignments
       WHERE quiz_id = $1 AND is_active = true
       LIMIT 1`,
      [quizId],
    );
    if (assignmentResult.rows.length > 0) {
      quizAssignment = assignmentResult.rows[0];
    }
  } catch (error) {
    // Table doesn't exist or query failed, continue without class assignment
    console.warn("Could not fetch quiz assignment:", error);
  }

  const quizData = quiz.questions as QuizPayload;

  const requestedPage = awaitedSearchParams?.page
    ? Number.parseInt(awaitedSearchParams.page, 10) || undefined
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-purple-600 font-bold">
          Quiz
        </p>
        <h1 className="text-3xl font-black text-purple-900">
          {quizData?.title ?? book?.title ?? "AI Quiz"}
        </h1>
        <p className="text-purple-700 font-semibold">
          Answer every question to submit your score.
        </p>
      </div>
      <QuizPlayer
        quizId={quiz.id}
        quizData={quizData}
        bookId={quiz.book_id}
        returnPage={requestedPage}
        classId={quizAssignment?.class_id}
      />
    </div>
  );
}
