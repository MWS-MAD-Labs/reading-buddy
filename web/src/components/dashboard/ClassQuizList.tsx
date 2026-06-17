"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  assignQuizToClass,
  unassignQuizFromClass,
} from "@/app/(dashboard)/dashboard/teacher/actions";
import { TeacherQuizCreator } from "./TeacherQuizCreator";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
  Select,
} from "@/components/ui";

type AvailableQuiz = {
  id: number;
  quiz_type: string;
  page_range_start: number | null;
  page_range_end: number | null;
  checkpoint_page: number | null;
  question_count: number;
  created_at: string;
};

type AssignedQuiz = {
  assignment_id: number;
  quiz_id: number;
  quiz_type: string;
  question_count: number;
  assigned_at: string;
  due_date: string | null;
  attempt_count: number;
  completed_count: number;
  total_students: number;
};

type ClassQuizListProps = {
  classId: number;
  bookId: number;
  bookTitle: string;
  availableQuizzes: AvailableQuiz[];
  assignedQuizzes: AssignedQuiz[];
};

export const ClassQuizList = ({
  classId,
  bookId,
  bookTitle,
  availableQuizzes,
  assignedQuizzes,
}: ClassQuizListProps) => {
  const router = useRouter();
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>("");

  const assignedQuizIds = new Set(assignedQuizzes.map((q) => q.quiz_id));
  const unassignedQuizzes = availableQuizzes.filter(
    (q) => !assignedQuizIds.has(q.id),
  );

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsAssigning(true);

    if (!selectedQuizId) {
      setError("Please select a quiz.");
      setIsAssigning(false);
      return;
    }

    try {
      await assignQuizToClass({
        classId,
        quizId: selectedQuizId,
        dueDate: dueDate || undefined,
      });
      setSelectedQuizId(null);
      setDueDate("");
      setIsFormOpen(false);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to assign quiz.";
      setError(message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (quizId: number) => {
    setError(null);
    try {
      await unassignQuizFromClass({ classId, quizId });
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to unassign quiz.";
      setError(message);
    }
  };

  const handleQuizCreated = () => {
    setIsCreateOpen(false);
    router.refresh();
  };

  const formatQuizLabel = (quiz: AvailableQuiz) => {
    if (quiz.quiz_type === "checkpoint") {
      return `Checkpoint quiz · Page ${quiz.checkpoint_page}`;
    }
    if (quiz.page_range_start && quiz.page_range_end) {
      return `Classroom quiz · Pages ${quiz.page_range_start}-${quiz.page_range_end}`;
    }
    return "Classroom quiz · Full book";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card variant="frosted" padding="cozy">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="amber">Quiz assignments</Badge>
            <CardTitle className="mt-2">{bookTitle}</CardTitle>
            <CardDescription>
              Create quizzes or assign existing quizzes to this class.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isCreateOpen ? "neutral" : "primary"}
              size="sm"
              onClick={() => {
                setIsCreateOpen((value) => !value);
                setIsFormOpen(false);
              }}
            >
              {isCreateOpen ? "Close creator" : "Create quiz"}
            </Button>
            <Button
              type="button"
              variant={isFormOpen ? "neutral" : "outline"}
              size="sm"
              onClick={() => {
                if (unassignedQuizzes.length > 0) {
                  setIsFormOpen((value) => !value);
                  setIsCreateOpen(false);
                }
              }}
              disabled={unassignedQuizzes.length === 0}
            >
              {isFormOpen ? "Close assign" : "Assign quiz"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isCreateOpen && (
        <TeacherQuizCreator
          classId={classId}
          bookId={bookId}
          bookTitle={bookTitle}
          onQuizCreated={handleQuizCreated}
          onCancel={() => setIsCreateOpen(false)}
        />
      )}

      {isFormOpen && (
        <form onSubmit={handleAssign} className="flex flex-col gap-3">
          <Select
            value={selectedQuizId ?? ""}
            onChange={(e) =>
              setSelectedQuizId(e.target.value ? Number(e.target.value) : null)
            }
            required
          >
            <option value="">Select a quiz...</option>
            {unassignedQuizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {formatQuizLabel(quiz)} · {quiz.question_count} questions
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Button
            type="submit"
            loading={isAssigning}
            disabled={!selectedQuizId}
            className="md:w-fit"
          >
            Assign quiz
          </Button>
        </form>
      )}

      {error && <FieldError className="mt-3">{error}</FieldError>}

      <div className="mt-4 space-y-3">
        {assignedQuizzes.map((quiz) => {
          const completionRate =
            quiz.total_students > 0
              ? Math.round((quiz.completed_count / quiz.total_students) * 100)
              : 0;

          return (
            <div
              key={quiz.assignment_id}
              className="flex flex-col gap-3 rounded-2xl border border-[#eadfda] bg-white/90 p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="heading-font font-bold text-[#241718]">
                    {quiz.quiz_type === "checkpoint"
                      ? "Checkpoint quiz"
                      : "Classroom quiz"}
                  </p>
                  <Badge variant="neutral" size="sm">
                    {quiz.question_count} questions
                  </Badge>
                </div>
                <p className="text-sm text-[#6f6061]">
                  Assigned {formatDate(quiz.assigned_at)}
                  {quiz.due_date && ` · Due ${formatDate(quiz.due_date)}`}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-[#6f6061]">
                    <span>
                      {quiz.completed_count}/{quiz.total_students} students
                      completed
                    </span>
                    <span>{completionRate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F5E7E8]">
                    <div
                      className="h-full rounded-full bg-[#7E1518] transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs font-medium text-[#8a7778]">
                  {quiz.attempt_count} total attempt
                  {quiz.attempt_count === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleUnassign(quiz.quiz_id)}
                className="w-fit"
              >
                Unassign
              </Button>
            </div>
          );
        })}
        {assignedQuizzes.length === 0 && !isCreateOpen && (
          <Card
            padding="snug"
            className="border-dashed text-center shadow-none"
          >
            <CardDescription>
              No quizzes assigned yet. Create a new quiz or assign an existing
              one.
            </CardDescription>
            {unassignedQuizzes.length === 0 &&
              availableQuizzes.length === 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-3"
                >
                  Create first quiz
                </Button>
              )}
          </Card>
        )}
      </div>
    </Card>
  );
};
