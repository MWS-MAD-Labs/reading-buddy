"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getBookDetailsForQuiz,
  previewQuizAsTeacher,
  saveAndAssignTeacherQuiz,
} from "@/app/(dashboard)/dashboard/teacher/actions";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  FieldHelper,
  Input,
  Label,
} from "@/components/ui";

type BookInfo = {
  id: number;
  title: string;
  pageCount: number | null;
  hasExtractedText: boolean;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};

type QuizPayload = {
  title?: string;
  description?: string;
  questions: QuizQuestion[];
};

type TeacherQuizCreatorProps = {
  classId: number;
  bookId: number;
  bookTitle: string;
  onQuizCreated?: () => void;
  onCancel?: () => void;
};

export const TeacherQuizCreator = ({
  classId,
  bookId,
  bookTitle,
  onQuizCreated,
  onCancel,
}: TeacherQuizCreatorProps) => {
  const router = useRouter();
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [quizType, setQuizType] = useState<"classroom" | "checkpoint">(
    "classroom",
  );
  const [usePageRange, setUsePageRange] = useState(false);
  const [pageRangeStart, setPageRangeStart] = useState(1);
  const [pageRangeEnd, setPageRangeEnd] = useState(10);
  const [checkpointPage, setCheckpointPage] = useState(10);
  const [questionCount, setQuestionCount] = useState(5);

  const [previewData, setPreviewData] = useState<QuizPayload | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    const loadBookInfo = async () => {
      try {
        const info = await getBookDetailsForQuiz(bookId);
        if (info) {
          setBookInfo(info);
          if (info.pageCount) {
            setPageRangeEnd(Math.min(10, info.pageCount));
            setCheckpointPage(Math.min(10, info.pageCount));
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load book info",
        );
      } finally {
        setLoading(false);
      }
    };
    loadBookInfo();
  }, [bookId]);

  const handlePreview = async () => {
    setGenerating(true);
    setError(null);

    try {
      const result = await previewQuizAsTeacher({
        classId,
        bookId,
        quizType,
        pageRangeStart: usePageRange ? pageRangeStart : undefined,
        pageRangeEnd: usePageRange ? pageRangeEnd : undefined,
        checkpointPage: quizType === "checkpoint" ? checkpointPage : undefined,
        questionCount,
      });

      setPreviewData(result.quiz);
      setIsPreviewMode(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate quiz preview",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setSaving(true);
    setError(null);

    try {
      await saveAndAssignTeacherQuiz({
        classId,
        bookId,
        quizType,
        pageRangeStart: usePageRange ? pageRangeStart : undefined,
        pageRangeEnd: usePageRange ? pageRangeEnd : undefined,
        checkpointPage: quizType === "checkpoint" ? checkpointPage : undefined,
        quizPayload: previewData,
      });
      setSuccess(true);
      router.refresh();
      if (onQuizCreated) {
        onQuizCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card padding="snug" className="border-dashed text-center shadow-none">
        <CardDescription>Loading quiz tools…</CardDescription>
      </Card>
    );
  }

  if (success) {
    return (
      <Card variant="playful" padding="snug" className="text-center">
        <Badge variant="lime">Quiz created</Badge>
        <CardTitle className="mt-3 text-lg">Assigned to class</CardTitle>
        <CardDescription>
          The quiz has been automatically assigned to your class.
        </CardDescription>
      </Card>
    );
  }

  if (isPreviewMode && previewData) {
    return (
      <Card
        variant="frosted"
        padding="snug"
        className="animate-in slide-in-from-right duration-300"
      >
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant="amber">Preview</Badge>
              <CardTitle className="mt-2 text-xl">
                Review quiz questions
              </CardTitle>
              <CardDescription>
                Check the generated content before assigning it to the class.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={() => setIsPreviewMode(false)}
            >
              Edit settings
            </Button>
          </div>
        </CardHeader>

        {error && <FieldError className="mb-3">{error}</FieldError>}

        <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {previewData.questions.map((question, questionIndex) => (
            <div
              key={questionIndex}
              className="rounded-2xl border border-[#eadfda] bg-white/90 p-4"
            >
              <p className="heading-font mb-3 font-bold text-[#241718]">
                {questionIndex + 1}. {question.question}
              </p>
              <div className="grid gap-2">
                {question.options.map((option, optionIndex) => {
                  const isAnswer = optionIndex === question.answerIndex;
                  return (
                    <div
                      key={optionIndex}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                        isAnswer
                          ? "border-[#6F8B6A]/50 bg-[#EDF3EB] text-[#486142]"
                          : "border-[#eadfda] bg-white text-[#5d4b4c]"
                      }`}
                    >
                      {option}
                      {isAnswer && " · Answer"}
                    </div>
                  );
                })}
              </div>
              {question.explanation && (
                <p className="mt-3 rounded-xl border border-[#eadfda] bg-[#fffaf4] p-3 text-xs text-[#6f6061]">
                  <span className="font-bold">Explanation:</span>{" "}
                  {question.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            loading={generating}
            disabled={saving}
            className="flex-1"
          >
            Regenerate
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={saving}
            disabled={generating}
            className="flex-[2]"
          >
            Confirm and assign
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="playful"
      padding="snug"
      className="animate-in fade-in duration-300"
    >
      <CardHeader>
        <Badge variant="bubble">Create quiz</Badge>
        <CardTitle className="mt-2 text-xl">Configure AI quiz</CardTitle>
        <CardDescription>{bookTitle}</CardDescription>
      </CardHeader>

      {error && <FieldError className="mb-3">{error}</FieldError>}

      {!bookInfo?.hasExtractedText && (
        <Card padding="snug" className="mb-4 border-dashed shadow-none">
          <Badge variant="amber" size="sm">
            Text not extracted
          </Badge>
          <CardDescription className="mt-2 text-sm">
            The quiz will be generated using the book description. For better
            quizzes, ask a librarian to extract text.
          </CardDescription>
        </Card>
      )}

      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setQuizType("classroom")}
            className={buttonVariants({
              variant: quizType === "classroom" ? "primary" : "neutral",
              size: "sm",
            })}
          >
            Classroom quiz
          </button>
          <button
            type="button"
            onClick={() => setQuizType("checkpoint")}
            className={buttonVariants({
              variant: quizType === "checkpoint" ? "secondary" : "neutral",
              size: "sm",
            })}
          >
            Checkpoint quiz
          </button>
        </div>

        <div>
          <Label htmlFor={`question-count-${bookId}`}>
            Number of questions
          </Label>
          <Input
            id={`question-count-${bookId}`}
            type="number"
            min={3}
            max={15}
            value={questionCount}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
            className="mt-2"
          />
        </div>

        {quizType === "checkpoint" && (
          <div>
            <Label htmlFor={`checkpoint-page-${bookId}`}>Checkpoint page</Label>
            <Input
              id={`checkpoint-page-${bookId}`}
              type="number"
              min={1}
              max={bookInfo?.pageCount || 100}
              value={checkpointPage}
              onChange={(event) =>
                setCheckpointPage(Number(event.target.value))
              }
              className="mt-2"
            />
            <FieldHelper className="mt-1">
              Students must complete this quiz before reading past page{" "}
              {checkpointPage}.
            </FieldHelper>
          </div>
        )}

        <label className="flex items-center gap-3 rounded-2xl border border-[#eadfda] bg-white/80 p-3 text-sm font-bold text-[#241718]">
          <input
            type="checkbox"
            id={`pageRange-${bookId}`}
            checked={usePageRange}
            onChange={(event) => setUsePageRange(event.target.checked)}
            className="h-4 w-4 rounded border-[#eadfda] accent-[#7E1518]"
          />
          Use specific page range
        </label>

        {usePageRange && (
          <div className="grid gap-3 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
            <div>
              <Label htmlFor={`page-start-${bookId}`}>From page</Label>
              <Input
                id={`page-start-${bookId}`}
                type="number"
                min={1}
                max={bookInfo?.pageCount || 100}
                value={pageRangeStart}
                onChange={(event) =>
                  setPageRangeStart(Number(event.target.value))
                }
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor={`page-end-${bookId}`}>To page</Label>
              <Input
                id={`page-end-${bookId}`}
                type="number"
                min={pageRangeStart}
                max={bookInfo?.pageCount || 100}
                value={pageRangeEnd}
                onChange={(event) =>
                  setPageRangeEnd(Number(event.target.value))
                }
                className="mt-2"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          {onCancel && (
            <Button
              type="button"
              variant="neutral"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handlePreview}
            loading={generating}
            className="flex-1"
          >
            Preview quiz
          </Button>
        </div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-[#7E1518]">
          Step 1 of 2: configure and generate
        </p>
      </div>
    </Card>
  );
};
