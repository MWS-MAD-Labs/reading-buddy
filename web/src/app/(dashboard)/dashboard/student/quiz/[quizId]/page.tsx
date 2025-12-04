import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuizPlayer } from "@/components/dashboard/QuizPlayer";

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

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, book_id, questions, books(title)")
    .eq("id", quizId)
    .single();

  if (!quiz) {
    notFound();
  }

  // Find which classroom this quiz belongs to (for redirect after completion)
  // Note: class_quiz_assignments table may not exist, handle gracefully
  let quizAssignment: { class_id: number } | null = null;
  try {
    const { data } = await supabase
      .from("class_quiz_assignments")
      .select("class_id")
      .eq("quiz_id", quizId)
      .eq("is_active", true)
      .maybeSingle();
    quizAssignment = data;
  } catch (error) {
    // Table doesn't exist or query failed, continue without class assignment
    console.warn("Could not fetch quiz assignment:", error);
  }

  // Extract book data from array if it exists
  const bookData =
    Array.isArray(quiz.books) && quiz.books.length > 0
      ? quiz.books[0]
      : quiz.books;
  const book = bookData as { title: string } | null;

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
