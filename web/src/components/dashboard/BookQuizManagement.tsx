"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  FieldHelper,
  Input,
  Label,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/cn";
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
        <Badge variant="lime" size="sm">
          Published
        </Badge>
      );
    }
    if (status === "archived") {
      return (
        <Badge variant="neutral" size="sm">
          Archived
        </Badge>
      );
    }
    return (
      <Badge variant="amber" size="sm">
        Draft
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card
        variant="frosted"
        padding="snug"
        className="text-center text-sm text-[#5d4b4c]"
      >
        Loading quizzes...
      </Card>
    );
  }

  return (
    <Card
      variant="playful"
      padding="snug"
      className="space-y-4 border border-[#eadfda]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="heading-font text-lg font-bold text-[#241718]">
            Quizzes for {bookTitle}
          </h4>
          <p className="text-sm text-[#5d4b4c]">
            Create, publish, archive, or preview reader quizzes.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? "neutral" : "primary"}
          size="sm"
        >
          {showCreateForm ? "Cancel" : "Create Quiz"}
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Create Quiz Form */}
      {showCreateForm && (
        <Card
          variant="frosted"
          padding="snug"
          className="space-y-4 border border-[#eadfda]"
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setQuizType("classroom")}
              className={cn(
                buttonVariants({
                  variant: quizType === "classroom" ? "primary" : "neutral",
                  size: "sm",
                }),
                "w-full",
              )}
            >
              Classroom
            </button>
            <button
              type="button"
              onClick={() => setQuizType("checkpoint")}
              className={cn(
                buttonVariants({
                  variant: quizType === "checkpoint" ? "secondary" : "neutral",
                  size: "sm",
                }),
                "w-full",
              )}
            >
              Checkpoint
            </button>
          </div>

          <div>
            <Label>Questions</Label>
            <Input
              type="number"
              min={3}
              max={15}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            />
          </div>

          {quizType === "checkpoint" && (
            <div>
              <Label>Checkpoint Page</Label>
              <Input
                type="number"
                min={1}
                max={bookPageCount || 100}
                value={checkpointPage}
                onChange={(e) => setCheckpointPage(Number(e.target.value))}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`pageRange-${bookId}`}
              checked={usePageRange}
              onChange={(e) => setUsePageRange(e.target.checked)}
              className="h-4 w-4 rounded border-[#eadfda] text-[#7E1518]"
            />
            <Label htmlFor={`pageRange-${bookId}`} className="text-sm">
              Use page range
            </Label>
          </div>

          {usePageRange && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>From</Label>
                <Input
                  type="number"
                  min={1}
                  max={bookPageCount || 100}
                  value={pageRangeStart}
                  onChange={(e) => setPageRangeStart(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>To</Label>
                <Input
                  type="number"
                  min={pageRangeStart}
                  max={bookPageCount || 100}
                  value={pageRangeEnd}
                  onChange={(e) => setPageRangeEnd(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={handleCreateQuiz}
            loading={creating}
            fullWidth
          >
            Create Quiz
          </Button>

          {!hasExtractedText && (
            <Alert variant="warning" title="Text not extracted">
              <div className="space-y-3">
                <p>
                  Extract text from the book file to generate more accurate
                  quizzes based on actual content.
                </p>
                <Button
                  type="button"
                  onClick={handleExtractForQuiz}
                  loading={extracting}
                  variant="neutral"
                  size="sm"
                  fullWidth
                >
                  Extract Text Now
                </Button>
              </div>
            </Alert>
          )}
        </Card>
      )}

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <Card
          variant="frosted"
          padding="cozy"
          className="border-dashed text-center"
        >
          <p className="text-sm font-semibold text-[#5d4b4c]">
            No quizzes yet for this book.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <Card
              key={quiz.id}
              variant="frosted"
              padding="snug"
              className="border border-[#eadfda]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="heading-font text-sm font-bold text-[#241718]">
                      {quiz.quiz_type === "checkpoint"
                        ? "Checkpoint Quiz"
                        : "Classroom Quiz"}
                    </span>
                    {getStatusBadge(quiz.status, quiz.is_published)}
                  </div>
                  <div className="text-xs font-semibold text-[#5d4b4c]">
                    {quiz.question_count} questions •
                    {quiz.checkpoint_page
                      ? ` Checkpoint at page ${quiz.checkpoint_page}`
                      : quiz.page_range_start && quiz.page_range_end
                        ? ` Pages ${quiz.page_range_start}-${quiz.page_range_end}`
                        : " Full book"}
                  </div>
                  {quiz.attempt_count > 0 && (
                    <FieldHelper>
                      {quiz.attempt_count} attempts
                      {quiz.average_score && ` • Avg: ${quiz.average_score}%`}
                    </FieldHelper>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  <Link
                    href={`/dashboard/student/quiz/${quiz.id}?origin=librarian-preview&bookId=${bookId}`}
                    className={cn(
                      buttonVariants({ variant: "neutral", size: "sm" }),
                      "min-h-8 px-3 py-1 text-xs no-underline",
                    )}
                  >
                    Preview
                  </Link>

                  {quiz.status === "draft" && (
                    <button
                      onClick={() => handlePublish(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "sm" }),
                        "min-h-8 px-3 py-1 text-xs",
                      )}
                    >
                      Publish
                    </button>
                  )}

                  {quiz.is_published && (
                    <button
                      onClick={() => handleUnpublish(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "min-h-8 px-3 py-1 text-xs",
                      )}
                    >
                      Unpublish
                    </button>
                  )}

                  {quiz.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className={cn(
                        buttonVariants({ variant: "neutral", size: "sm" }),
                        "min-h-8 px-3 py-1 text-xs",
                      )}
                    >
                      Archive
                    </button>
                  )}

                  {quiz.attempt_count === 0 && (
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      disabled={actionLoading === quiz.id}
                      className={cn(
                        buttonVariants({ variant: "danger", size: "sm" }),
                        "min-h-8 px-3 py-1 text-xs",
                      )}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};
