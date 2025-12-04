"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  publishQuiz,
  unpublishQuiz,
  archiveQuiz,
  deleteQuiz,
  getQuizzesForBook,
  generateQuizForBookWithContent,
  extractBookText,
} from "@/app/(dashboard)/dashboard/librarian/actions";

type Quiz = {
  id: number;
  quiz_type: string;
  status: string;
  is_published: boolean;
  created_at: string;
  page_range_start: number | null;
  page_range_end: number | null;
  checkpoint_page: number | null;
  question_count: number;
  attempt_count: number;
  average_score: number | null;
};

type BookQuizManagementProps = {
  bookId: number;
  bookTitle: string;
  bookPageCount: number | null;
  hasExtractedText: boolean;
};

export const BookQuizManagement = ({
  bookId,
  bookTitle,
  bookPageCount,
  hasExtractedText,
}: BookQuizManagementProps) => {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Quiz creation form state
  const [quizType, setQuizType] = useState<"classroom" | "checkpoint">(
    "classroom",
  );
  const [usePageRange, setUsePageRange] = useState(false);
  const [pageRangeStart, setPageRangeStart] = useState(1);
  const [pageRangeEnd, setPageRangeEnd] = useState(
    Math.min(10, bookPageCount || 10),
  );
  const [checkpointPage, setCheckpointPage] = useState(
    Math.min(10, bookPageCount || 10),
  );
  const [questionCount, setQuestionCount] = useState(5);
  const [creating, setCreating] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, [bookId]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const result = await getQuizzesForBook(bookId);
      setQuizzes(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (quizId: number) => {
    setActionLoading(quizId);
    try {
      await publishQuiz(quizId);
      await loadQuizzes();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (quizId: number) => {
    setActionLoading(quizId);
    try {
      await unpublishQuiz(quizId);
      await loadQuizzes();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unpublish");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (quizId: number) => {
    if (!confirm("Archive this quiz?")) return;
    setActionLoading(quizId);
    try {
      await archiveQuiz(quizId);
      await loadQuizzes();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (quizId: number) => {
    if (!confirm("Delete this quiz permanently?")) return;
    setActionLoading(quizId);
    try {
      await deleteQuiz(quizId);
      await loadQuizzes();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateQuiz = async () => {
    setCreating(true);
    setError(null);
    try {
      await generateQuizForBookWithContent({
        bookId,
        quizType,
        pageRangeStart: usePageRange ? pageRangeStart : undefined,
        pageRangeEnd: usePageRange ? pageRangeEnd : undefined,
        checkpointPage: quizType === "checkpoint" ? checkpointPage : undefined,
        questionCount,
      });
      setShowCreateForm(false);
      await loadQuizzes();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quiz");
    } finally {
      setCreating(false);
    }
  };

  const handleExtractForQuiz = async () => {
    setExtracting(true);
    setError(null);
    try {
      const result = await extractBookText(bookId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.message || "Failed to extract text");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract text");
    } finally {
      setExtracting(false);
    }
  };

  const getStatusBadge = (status: string, isPublished: boolean) => {
    if (isPublished) {
      return (
        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
          ✓ Published
        </span>
      );
    }
    if (status === "archived") {
      return (
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
          📦 Archived
        </span>
      );
    }
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
        ✎ Draft
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Loading quizzes...
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border-4 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-black text-indigo-900">
          📝 Quizzes for {bookTitle}
        </h4>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg border-2 border-purple-300 bg-purple-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-600"
        >
          {showCreateForm ? "✕ Cancel" : "➕ Create Quiz"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* Create Quiz Form */}
      {showCreateForm && (
        <div className="space-y-3 rounded-xl border-2 border-purple-300 bg-white p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setQuizType("classroom")}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-bold ${
                quizType === "classroom"
                  ? "border-blue-400 bg-blue-100 text-blue-900"
                  : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              🏫 Classroom
            </button>
            <button
              onClick={() => setQuizType("checkpoint")}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-bold ${
                quizType === "checkpoint"
                  ? "border-green-400 bg-green-100 text-green-900"
                  : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              🎯 Checkpoint
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Questions
            </label>
            <input
              type="number"
              min={3}
              max={15}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {quizType === "checkpoint" && (
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                Checkpoint Page
              </label>
              <input
                type="number"
                min={1}
                max={bookPageCount || 100}
                value={checkpointPage}
                onChange={(e) => setCheckpointPage(Number(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`pageRange-${bookId}`}
              checked={usePageRange}
              onChange={(e) => setUsePageRange(e.target.checked)}
              className="h-4 w-4"
            />
            <label
              htmlFor={`pageRange-${bookId}`}
              className="text-xs font-bold text-gray-700"
            >
              Use Page Range
            </label>
          </div>

          {usePageRange && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  From
                </label>
                <input
                  type="number"
                  min={1}
                  max={bookPageCount || 100}
                  value={pageRangeStart}
                  onChange={(e) => setPageRangeStart(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  To
                </label>
                <input
                  type="number"
                  min={pageRangeStart}
                  max={bookPageCount || 100}
                  value={pageRangeEnd}
                  onChange={(e) => setPageRangeEnd(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleCreateQuiz}
            disabled={creating}
            className={`w-full rounded-lg border-2 px-4 py-3 text-sm font-bold text-white transition disabled:opacity-50 ${
              creating
                ? "animate-pulse border-purple-400 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"
                : "border-purple-400 bg-purple-500 hover:bg-purple-600"
            }`}
            style={
              creating
                ? {
                    animation:
                      "pulse 1.5s ease-in-out infinite, gradient 2s ease-in-out infinite",
                    backgroundSize: "200% 100%",
                  }
                : undefined
            }
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span className="animate-pulse">✨ Creating Quiz...</span>
              </span>
            ) : (
              "🎲 Create Quiz"
            )}
          </button>

          {!hasExtractedText && (
            <div className="space-y-2 rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
              <p className="text-sm font-bold text-orange-700">
                ⚠️ Text not extracted
              </p>
              <p className="text-xs text-orange-600">
                Extract text from the book PDF to generate better, more accurate
                quizzes based on actual content.
              </p>
              <button
                onClick={handleExtractForQuiz}
                disabled={extracting}
                className="w-full rounded-lg border-2 border-orange-400 bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {extracting ? "⏳ Extracting..." : "📝 Extract Text Now"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-gray-400">
            No quizzes yet for this book
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="rounded-lg border-2 border-indigo-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {quiz.quiz_type === "checkpoint" ? "🎯" : "🏫"}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {quiz.quiz_type === "checkpoint"
                        ? "Checkpoint Quiz"
                        : "Classroom Quiz"}
                    </span>
                    {getStatusBadge(quiz.status, quiz.is_published)}
                  </div>
                  <div className="text-xs font-semibold text-gray-600">
                    {quiz.question_count} questions •
                    {quiz.checkpoint_page
                      ? ` Checkpoint at page ${quiz.checkpoint_page}`
                      : quiz.page_range_start && quiz.page_range_end
                        ? ` Pages ${quiz.page_range_start}-${quiz.page_range_end}`
                        : " Full book"}
                  </div>
                  {quiz.attempt_count > 0 && (
                    <div className="text-xs text-gray-500">
                      📊 {quiz.attempt_count} attempts
                      {quiz.average_score && ` • Avg: ${quiz.average_score}%`}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  <Link
                    href={`/dashboard/student/quiz/${quiz.id}`}
                    className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    👁️
                  </Link>

                  {quiz.status === "draft" && (
                    <button
                      onClick={() => handlePublish(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      ✓
                    </button>
                  )}

                  {quiz.is_published && (
                    <button
                      onClick={() => handleUnpublish(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className="rounded border border-yellow-300 bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                    >
                      ✎
                    </button>
                  )}

                  {quiz.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className="rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      📦
                    </button>
                  )}

                  {quiz.attempt_count === 0 && (
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
