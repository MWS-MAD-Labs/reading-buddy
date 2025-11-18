import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuizPlayer } from "@/components/dashboard/QuizPlayer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ quizId: string }>;
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

export default async function StudentQuizPage({ params }: PageProps) {
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
    .select("id, questions, books(title)")
    .eq("id", quizId)
    .single();

  if (!quiz) {
    notFound();
  }

  // Extract book data from array if it exists
  const bookData =
    Array.isArray(quiz.books) && quiz.books.length > 0
      ? quiz.books[0]
      : quiz.books;
  const book = bookData as { title: string } | null;

  const quizData = quiz.questions as QuizPayload;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-white/60">Quiz</p>
        <h1 className="text-3xl font-semibold text-white">
          {quizData?.title ?? book?.title ?? "AI Quiz"}
        </h1>
        <p className="text-white/70">
          Answer every question to submit your score.
        </p>
      </div>
      <QuizPlayer quizId={quiz.id} quizData={quizData} />
    </div>
  );
}
