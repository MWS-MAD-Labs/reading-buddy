'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  publishQuiz,
  unpublishQuiz,
  archiveQuiz,
  deleteQuiz
} from '@/app/(dashboard)/dashboard/librarian/actions';
import { useRouter } from 'next/navigation';

type QuizItem = {
  id: number;
  book_id: number;
  quiz_type: string;
  status: string;
  is_published: boolean;
  created_at: string;
  page_range_start: number | null;
  page_range_end: number | null;
  checkpoint_page: number | null;
  attempt_count: number;
  average_score: number | null;
  last_attempted_at: string | null;
  question_count: number;
};

type BookGroup = {
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  quizzes: QuizItem[];
};

type QuizManagementPanelProps = {
  bookGroups: BookGroup[];
};

export const QuizManagementPanel = ({ bookGroups }: QuizManagementPanelProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const handlePublish = async (quizId: number) => {
    setLoading(quizId);
    setError(null);
    try {
      await publishQuiz(quizId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish quiz');
    } finally {
      setLoading(null);
    }
  };

  const handleUnpublish = async (quizId: number) => {
    setLoading(quizId);
    setError(null);
    try {
      await unpublishQuiz(quizId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish quiz');
    } finally {
      setLoading(null);
    }
  };

  const handleArchive = async (quizId: number) => {
    if (!confirm('Archive this quiz? It will be hidden from teachers.')) return;

    setLoading(quizId);
    setError(null);
    try {
      await archiveQuiz(quizId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive quiz');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (quizId: number) => {
    if (!confirm('Delete this quiz permanently? This cannot be undone.')) return;

    setLoading(quizId);
    setError(null);
    try {
      await deleteQuiz(quizId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quiz');
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">✓ Published</span>;
      case 'draft':
        return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">✎ Draft</span>;
      case 'archived':
        return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">📦 Archived</span>;
      default:
        return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{status}</span>;
    }
  };

  const getQuizTypeIcon = (type: string) => {
    return type === 'checkpoint' ? '🎯' : '🏫';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPageRangeText = (quiz: QuizItem) => {
    if (quiz.checkpoint_page) {
      return `Checkpoint at page ${quiz.checkpoint_page}`;
    }
    if (quiz.page_range_start && quiz.page_range_end) {
      return `Pages ${quiz.page_range_start}-${quiz.page_range_end}`;
    }
    return 'Full book';
  };

  // Filter quizzes
  const filteredGroups = bookGroups.map(group => ({
    ...group,
    quizzes: group.quizzes.filter(quiz => {
      if (filterStatus !== 'all' && quiz.status !== filterStatus) return false;
      if (filterType !== 'all' && quiz.quiz_type !== filterType) return false;
      return true;
    })
  })).filter(group => group.quizzes.length > 0);

  return (
    <section className="space-y-6 rounded-3xl border-4 border-blue-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 shadow-2xl">
      <div>
        <div className="mb-3 inline-block rounded-2xl border-4 border-blue-300 bg-blue-400 px-4 py-2">
          <p className="text-base font-black uppercase tracking-wide text-white">📝 Quiz Library</p>
        </div>
        <h2 className="text-3xl font-black text-blue-900">Quiz Management</h2>
        <p className="text-lg font-semibold text-blue-600">
          Manage, publish, and organize all your quizzes
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-bold text-blue-700">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-xl border-2 border-blue-300 bg-white px-4 py-2 font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-bold text-blue-700">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-xl border-2 border-blue-300 bg-white px-4 py-2 font-semibold"
          >
            <option value="all">All Types</option>
            <option value="classroom">Classroom Quizzes</option>
            <option value="checkpoint">Checkpoint Quizzes</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border-4 border-red-300 bg-red-50 px-5 py-4">
          <p className="text-center font-bold text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Quiz List Grouped by Book */}
      <div className="space-y-6">
        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border-4 border-dashed border-blue-200 bg-blue-50/50 p-12 text-center">
            <p className="text-xl font-bold text-blue-400">No quizzes found</p>
            <p className="text-blue-300">Generate quizzes using the tools above</p>
          </div>
        ) : (
          filteredGroups.map((group: any) => (
            <div key={group.bookId} className="space-y-3">
              {/* Book Header */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-blue-900">📚 {group.bookTitle}</h3>
                  <p className="text-sm font-semibold text-blue-600">by {group.bookAuthor}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-700">
                  {group.quizzes.length} {group.quizzes.length === 1 ? 'quiz' : 'quizzes'}
                </span>
              </div>

              {/* Quiz Cards */}
              {group.quizzes.map((quiz: any) => (
                <div
                  key={quiz.id}
                  className="rounded-2xl border-4 border-blue-200 bg-white p-5 shadow-lg transition hover:shadow-xl"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    {/* Quiz Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getQuizTypeIcon(quiz.quiz_type)}</span>
                        <h4 className="text-lg font-black text-blue-900">
                          {quiz.quiz_type === 'checkpoint' ? 'Checkpoint Quiz' : 'Classroom Quiz'}
                        </h4>
                        {getStatusBadge(quiz.status)}
                      </div>

                      <div className="space-y-1 text-sm font-semibold text-blue-600">
                        <p>📄 {quiz.question_count} questions • {getPageRangeText(quiz)}</p>
                        <p>🕒 Created {formatDate(quiz.created_at)}</p>
                        {quiz.attempt_count > 0 ? (
                          <p>
                            📊 Taken {quiz.attempt_count} {quiz.attempt_count === 1 ? 'time' : 'times'}
                            {quiz.average_score && ` • Avg score: ${quiz.average_score}%`}
                          </p>
                        ) : (
                          <p className="text-gray-400">📊 Not taken yet</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/student/quiz/${quiz.id}`}
                        className="rounded-lg border-2 border-blue-300 bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-200"
                      >
                        👁️ Preview
                      </Link>

                      {quiz.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(quiz.id)}
                          disabled={loading === quiz.id}
                          className="rounded-lg border-2 border-green-300 bg-green-100 px-4 py-2 text-sm font-bold text-green-700 transition hover:bg-green-200 disabled:opacity-50"
                        >
                          {loading === quiz.id ? '...' : '✓ Publish'}
                        </button>
                      )}

                      {quiz.status === 'published' && (
                        <button
                          onClick={() => handleUnpublish(quiz.id)}
                          disabled={loading === quiz.id}
                          className="rounded-lg border-2 border-yellow-300 bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700 transition hover:bg-yellow-200 disabled:opacity-50"
                        >
                          {loading === quiz.id ? '...' : '✎ Unpublish'}
                        </button>
                      )}

                      {quiz.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(quiz.id)}
                          disabled={loading === quiz.id}
                          className="rounded-lg border-2 border-gray-300 bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                        >
                          {loading === quiz.id ? '...' : '📦 Archive'}
                        </button>
                      )}

                      {quiz.attempt_count === 0 && (
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          disabled={loading === quiz.id}
                          className="rounded-lg border-2 border-red-300 bg-red-100 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                        >
                          {loading === quiz.id ? '...' : '🗑️ Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {filteredGroups.length > 0 && (
        <div className="rounded-2xl border-4 border-blue-200 bg-blue-50 p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-black text-blue-700">
                {filteredGroups.reduce((sum, g) => sum + g.quizzes.length, 0)}
              </p>
              <p className="text-sm font-semibold text-blue-600">Total Quizzes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-green-700">
                {filteredGroups.reduce((sum, g) => sum + g.quizzes.filter(q => q.is_published).length, 0)}
              </p>
              <p className="text-sm font-semibold text-green-600">Published</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-purple-700">
                {filteredGroups.reduce((sum, g) => sum + g.quizzes.filter(q => q.quiz_type === 'checkpoint').length, 0)}
              </p>
              <p className="text-sm font-semibold text-purple-600">Checkpoints</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-orange-700">
                {filteredGroups.reduce((sum, g) => sum + g.quizzes.reduce((s, q) => s + q.attempt_count, 0), 0)}
              </p>
              <p className="text-sm font-semibold text-orange-600">Total Attempts</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
