"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAttempt } from "@/app/(dashboard)/dashboard/student/quiz/actions";
import { updatePhysicalReadingProgress } from "@/app/(dashboard)/dashboard/student/actions";
import { publishQuiz } from "@/app/(dashboard)/dashboard/librarian/actions";

type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
};

type QuizData = {
  title?: string;
  questions: QuizQuestion[];
};

type QuizOrigin =
  | "reading"
  | "progress-update"
  | "librarian-preview"
  | "classroom";

type QuizPlayerProps = {
  quizId: number;
  quizData: QuizData;
  bookId?: number;
  returnPage?: number;
  targetPage?: number;
  classId?: number;
  origin?: QuizOrigin;
  quizStatus?: string;
};

export const QuizPlayer = ({
  quizId,
  quizData,
  bookId,
  returnPage,
  targetPage,
  classId,
  origin,
  quizStatus,
}: QuizPlayerProps) => {
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    quizData.questions.map(() => null),
  );
  const [status, setStatus] = useState<"idle" | "submitting" | "completed">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [completionActionPending, setCompletionActionPending] = useState(false);
  const router = useRouter();
  const librarianReturnPath = bookId
    ? `/dashboard/librarian?quizBookId=${bookId}`
    : "/dashboard/librarian";

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) =>
      prev.map((value, idx) => (idx === questionIndex ? optionIndex : value)),
    );
  };

  const handleSubmit = async () => {
    if (selectedAnswers.some((answer) => answer === null)) {
      setError("Answer every question before submitting.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const result = await submitQuizAttempt({
        quizId,
        answers: selectedAnswers.map((answer) => Number(answer)),
        preview: origin === "librarian-preview",
      });
      setScore(result.scorePercent);
      setStatus("completed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to submit quiz.";
      setError(message);
      setStatus("idle");
    }
  };

  const handleProgressUpdate = async () => {
    if (!bookId || !targetPage) return;

    setCompletionActionPending(true);
    setError(null);

    try {
      const result = await updatePhysicalReadingProgress({
        bookId,
        currentPage: targetPage,
      });

      if (!result.success) {
        if (result.code === "CHECKPOINT_REQUIRED") {
          router.push(
            `/dashboard/student/quiz/${result.checkpoint.quizId}?origin=progress-update&bookId=${bookId}&page=${result.checkpoint.checkpointPage}&targetPage=${targetPage}`,
          );
          return;
        }
        setError(result.message);
        return;
      }

      router.push("/dashboard/student");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to finish the page update.",
      );
    } finally {
      setCompletionActionPending(false);
    }
  };

  const handlePublishAndReturn = async () => {
    setCompletionActionPending(true);
    setError(null);

    try {
      await publishQuiz(quizId);
      router.push(librarianReturnPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish quiz.");
      setCompletionActionPending(false);
    }
  };

  const answerLabels = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="space-y-6">
      {quizData.questions.map((question, questionIndex) => (
        <div
          key={questionIndex}
          className="pop-in sticker-card rounded-3xl border-4 border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-lg"
        >
          <div className="mb-4 inline-block rounded-2xl border-4 border-purple-300 bg-purple-500 px-4 py-2">
            <p className="text-lg font-black text-white">
              ❓ Question {questionIndex + 1}
            </p>
          </div>
          <h2 className="text-2xl font-black text-purple-900">
            {question.question}
          </h2>

          <div className="mt-5 grid gap-3">
            {question.options.map((option, optionIndex) => {
              const isSelected = selectedAnswers[questionIndex] === optionIndex;
              const isCorrect =
                status === "completed" && question.answerIndex === optionIndex;
              const isWrong =
                status === "completed" &&
                isSelected &&
                question.answerIndex !== optionIndex;

              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => handleSelect(questionIndex, optionIndex)}
                  disabled={status === "completed"}
                  className={`btn-squish rounded-2xl border-4 px-5 py-4 text-left text-lg font-bold transition-all ${isSelected && status !== "completed"
                      ? "border-yellow-400 bg-yellow-100 text-yellow-900 shadow-lg"
                      : "border-purple-300 bg-white text-purple-900"
                    } ${isCorrect ? "border-green-400 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700" : ""} ${isWrong
                      ? "border-red-400 bg-gradient-to-r from-red-100 to-pink-100 text-red-700"
                      : ""
                    } ${!isSelected && status !== "completed" ? "hover:border-blue-400 hover:bg-blue-50" : ""} disabled:cursor-default`}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current font-black">
                      {answerLabels[optionIndex]}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isCorrect && <span className="text-2xl">✅</span>}
                    {isWrong && <span className="text-2xl">❌</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {status === "completed" ? (
            <div
              className={`mt-5 rounded-2xl border-4 p-4 ${selectedAnswers[questionIndex] === question.answerIndex
                  ? "border-green-300 bg-green-50"
                  : "border-yellow-300 bg-yellow-50"
                }`}
            >
              <p
                className={`text-base font-bold ${selectedAnswers[questionIndex] === question.answerIndex
                    ? "text-green-800"
                    : "text-yellow-800"
                  }`}
              >
                💡{" "}
                {selectedAnswers[questionIndex] === question.answerIndex
                  ? question.correctFeedback ||
                  question.explanation ||
                  "Correct! Well done!"
                  : question.incorrectFeedback ||
                  `The correct answer is ${answerLabels[question.answerIndex]}.`}
              </p>
            </div>
          ) : null}
        </div>
      ))}

      {error ? (
        <div className="rounded-2xl border-4 border-red-300 bg-red-50 px-5 py-4">
          <p className="text-center text-lg font-bold text-red-600">
            ⚠️ {error}
          </p>
        </div>
      ) : null}

      {status === "completed" && score !== null ? (
        <div className="pop-in sticker-card rounded-3xl border-4 border-green-300 bg-gradient-to-br from-green-100 to-emerald-100 p-8 text-center shadow-2xl">
          <div className="mb-4 text-6xl">
            {score >= 80 ? "🎉" : score >= 60 ? "😊" : "💪"}
          </div>
          <h3 className="mb-3 text-3xl font-black text-green-700">
            {score >= 80
              ? "Amazing Job!"
              : score >= 60
                ? "Great Effort!"
                : "Keep Trying!"}
          </h3>
          <div className="text-5xl font-black text-green-600">{score}%</div>
          <p className="mt-3 text-xl font-bold text-green-700">Final Score</p>
        </div>
      ) : null}

      {status === "completed" &&
      score !== null &&
      origin === "progress-update" &&
      bookId &&
      targetPage ? (
        <button
          type="button"
          onClick={handleProgressUpdate}
          disabled={completionActionPending}
          className="btn-3d btn-squish mt-4 w-full rounded-3xl border-4 border-green-300 bg-gradient-to-r from-green-400 to-emerald-500 px-8 py-4 text-xl font-black text-white shadow-2xl hover:from-green-500 hover:to-emerald-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {completionActionPending
            ? "Saving page update…"
            : `Confirm and update to page ${targetPage}`}
        </button>
      ) : null}

      {status === "completed" &&
      score !== null &&
      origin === "librarian-preview" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push(librarianReturnPath)}
            disabled={completionActionPending}
            className="btn-3d btn-squish w-full rounded-3xl border-4 border-blue-300 bg-gradient-to-r from-blue-400 to-indigo-500 px-8 py-4 text-xl font-black text-white shadow-2xl hover:from-blue-500 hover:to-indigo-600 disabled:pointer-events-none disabled:opacity-50"
          >
            ⬅️ Back to quiz panel
          </button>
          {quizStatus === "draft" ? (
            <button
              type="button"
              onClick={handlePublishAndReturn}
              disabled={completionActionPending}
              className="btn-3d btn-squish w-full rounded-3xl border-4 border-green-300 bg-gradient-to-r from-green-400 to-emerald-500 px-8 py-4 text-xl font-black text-white shadow-2xl hover:from-green-500 hover:to-emerald-600 disabled:pointer-events-none disabled:opacity-50"
            >
              {completionActionPending
                ? "Publishing…"
                : "Confirm, publish, and return"}
            </button>
          ) : null}
        </div>
      ) : null}

      {status === "completed" &&
      score !== null &&
      bookId &&
      (origin === "reading" || (!origin && !classId)) ? (
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/student/read/${bookId}${returnPage ? `?page=${returnPage}` : ""}`)
          }
          className="btn-3d btn-squish mt-4 w-full rounded-3xl border-4 border-green-300 bg-gradient-to-r from-green-400 to-emerald-500 px-8 py-4 text-xl font-black text-white shadow-2xl hover:from-green-500 hover:to-emerald-600"
        >
          📖 Continue Reading
        </button>
      ) : null}

      {status === "completed" &&
      score !== null &&
      classId &&
      (origin === "classroom" || !origin) ? (
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/student/classrooms/${classId}`)
          }
          className="btn-3d btn-squish mt-2 w-full rounded-3xl border-4 border-blue-300 bg-gradient-to-r from-blue-400 to-indigo-500 px-8 py-4 text-xl font-black text-white shadow-2xl hover:from-blue-500 hover:to-indigo-600"
        >
          ⬅️ Back to classroom
        </button>
      ) : null}

      {status !== "completed" ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "submitting"}
          className="btn-3d btn-squish w-full rounded-3xl border-4 border-green-300 bg-gradient-to-r from-green-400 to-emerald-500 px-8 py-5 text-2xl font-black text-white shadow-2xl transition hover:from-green-500 hover:to-emerald-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {status === "submitting" ? "📝 Submitting…" : "🚀 Submit My Answers!"}
        </button>
      ) : null}
    </div>
  );
};
