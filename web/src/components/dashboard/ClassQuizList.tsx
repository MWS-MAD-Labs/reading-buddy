'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { assignQuizToClass, unassignQuizFromClass } from '@/app/(dashboard)/dashboard/teacher/actions';

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
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>('');

  const assignedQuizIds = new Set(assignedQuizzes.map((q) => q.quiz_id));
  const unassignedQuizzes = availableQuizzes.filter((q) => !assignedQuizIds.has(q.id));

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsAssigning(true);

    if (!selectedQuizId) {
      setError('Please select a quiz.');
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
      setDueDate('');
      setIsFormOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to assign quiz.';
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
      const message = err instanceof Error ? err.message : 'Unable to unassign quiz.';
      setError(message);
    }
  };

  const formatQuizLabel = (quiz: AvailableQuiz) => {
    if (quiz.quiz_type === 'checkpoint') {
      return `Checkpoint Quiz (Page ${quiz.checkpoint_page})`;
    }
    return `Classroom Quiz (Pages ${quiz.page_range_start}-${quiz.page_range_end})`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4 rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_rgba(168,85,247,0.18)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Quiz Assignments</p>
          <h2 className="text-xl font-black text-indigo-950">{bookTitle}</h2>
          <p className="text-sm font-medium text-indigo-500">Assign quizzes created by librarians to your class.</p>
        </div>
        <button
          type="button"
          onClick={() => unassignedQuizzes.length > 0 && setIsFormOpen((value) => !value)}
          disabled={unassignedQuizzes.length === 0}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-[0_12px_30px_rgba(168,85,247,0.45)] transition hover:shadow-[0_16px_35px_rgba(168,85,247,0.5)] disabled:opacity-40"
          aria-label="Assign quiz to class"
        >
          +
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleAssign} className="flex flex-col gap-3">
          <select
            value={selectedQuizId ?? ''}
            onChange={(e) => setSelectedQuizId(e.target.value ? Number(e.target.value) : null)}
            required
            className="w-full rounded-2xl border border-purple-200 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_12px_30px_rgba(168,85,247,0.25)] focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">Select a quiz...</option>
            {unassignedQuizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {formatQuizLabel(quiz)} - {quiz.question_count} questions
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="Due date (optional)"
            className="w-full rounded-2xl border border-purple-200 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_12px_30px_rgba(168,85,247,0.25)] focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button
            type="submit"
            disabled={isAssigning || !selectedQuizId}
            className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-400 px-6 py-3 font-semibold text-white shadow-[0_15px_35px_rgba(168,85,247,0.4)] transition hover:shadow-[0_20px_40px_rgba(168,85,247,0.5)] disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : 'Assign Quiz'}
          </button>
        </form>
      )}

      {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}

      <div className="mt-4 space-y-3">
        {assignedQuizzes.map((quiz) => (
          <div
            key={quiz.assignment_id}
            className="flex flex-col gap-3 rounded-2xl border border-purple-100 bg-white/90 p-4 shadow-[0_16px_40px_rgba(168,85,247,0.15)] md:flex-row md:items-center md:justify-between"
          >
            <div className="flex-1">
              <p className="font-semibold text-indigo-900">
                {quiz.quiz_type === 'checkpoint' ? '📍 Checkpoint Quiz' : '📝 Classroom Quiz'}
              </p>
              <p className="text-sm text-indigo-500">
                {quiz.question_count} questions • Assigned {formatDate(quiz.assigned_at)}
                {quiz.due_date && ` • Due ${formatDate(quiz.due_date)}`}
              </p>
              <p className="text-xs text-indigo-400">
                Progress: {quiz.completed_count}/{quiz.total_students} students completed ({quiz.attempt_count}{' '}
                total attempts)
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUnassign(quiz.quiz_id)}
              className="w-fit rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-200"
            >
              Unassign
            </button>
          </div>
        ))}
        {assignedQuizzes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/60 p-6 text-center text-purple-400">
            No quizzes assigned yet.{' '}
            {unassignedQuizzes.length > 0
              ? 'Use the + button to assign a quiz.'
              : 'No quizzes available for this book yet.'}
          </p>
        )}
      </div>
    </div>
  );
};
