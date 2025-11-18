'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateQuizForBookWithContent, autoGenerateCheckpoints } from '@/app/(dashboard)/dashboard/librarian/actions';

type Book = {
  id: number;
  title: string;
  description: string | null;
  page_count: number | null;
  text_extracted_at: string | null;
};

type EnhancedQuizGeneratorProps = {
  books: Book[];
};

export const EnhancedQuizGenerator = ({ books }: EnhancedQuizGeneratorProps) => {
  const [bookId, setBookId] = useState<number | null>(books[0]?.id ?? null);
  const [quizType, setQuizType] = useState<'classroom' | 'checkpoint'>('classroom');
  const [usePageRange, setUsePageRange] = useState(false);
  const [pageRangeStart, setPageRangeStart] = useState<number>(1);
  const [pageRangeEnd, setPageRangeEnd] = useState<number>(10);
  const [checkpointPage, setCheckpointPage] = useState<number>(10);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quizLink, setQuizLink] = useState<string | null>(null);
  const [contentSource, setContentSource] = useState<string | null>(null);

  const selectedBook = books.find((b) => b.id === bookId);
  const hasExtractedText = !!selectedBook?.text_extracted_at;
  const maxPage = selectedBook?.page_count ?? 100;

  const handleGenerate = async () => {
    if (!bookId) {
      setError('Select a book first.');
      return;
    }

    setStatus('loading');
    setError(null);
    setQuizLink(null);
    setContentSource(null);

    try {
      const result = await generateQuizForBookWithContent({
        bookId,
        quizType,
        pageRangeStart: usePageRange ? pageRangeStart : undefined,
        pageRangeEnd: usePageRange ? pageRangeEnd : undefined,
        checkpointPage: quizType === 'checkpoint' ? checkpointPage : undefined,
        questionCount,
      });

      setQuizLink(`/dashboard/student/quiz/${result.quizId}`);
      setContentSource(result.contentSource);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate quiz.';
      setError(message);
      setStatus('idle');
    }
  };

  const handleAutoCheckpoints = async () => {
    if (!bookId) {
      setError('Select a book first.');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const result = await autoGenerateCheckpoints({ bookId });

      alert(
        `Auto-Checkpoint Suggestion for "${result.bookTitle}":\n\n` +
        `Total Pages: ${result.totalPages}\n` +
        `Suggested Checkpoints: ${result.suggestedCheckpoints.length}\n\n` +
        result.suggestedCheckpoints.map((c) => `• Page ${c.page}: ${c.preview}`).join('\n') +
        `\n\n${result.hasExtractedText ? '✅ Text extracted - ready to generate!' : '⚠️ Extract text first for better quizzes'}`
      );

      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate checkpoints.';
      setError(message);
      setStatus('idle');
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border-4 border-indigo-300 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 shadow-2xl">
      <div>
        <div className="mb-3 inline-block rounded-2xl border-4 border-purple-300 bg-purple-400 px-4 py-2">
          <p className="text-base font-black uppercase tracking-wide text-white">🎯 Enhanced Quiz Generator</p>
        </div>
        <h2 className="text-3xl font-black text-indigo-900">AI-Powered Quiz Creation</h2>
        <p className="text-lg font-semibold text-indigo-600">
          Create quizzes from actual book content with page-range precision
        </p>
      </div>

      <div className="space-y-5">
        {/* Book Selection */}
        <div className="space-y-2">
          <label className="text-lg font-black text-indigo-700">📚 Select Book</label>
          <select
            className="w-full rounded-2xl border-4 border-indigo-300 bg-white px-5 py-4 text-lg font-bold text-indigo-900"
            value={bookId ?? ''}
            onChange={(e) => {
              const newBookId = Number(e.target.value);
              setBookId(newBookId);
              const book = books.find((b) => b.id === newBookId);
              if (book?.page_count) {
                setPageRangeEnd(Math.min(10, book.page_count));
                setCheckpointPage(Math.min(10, book.page_count));
              }
            }}
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} {book.text_extracted_at ? '✅' : '⚠️'}
              </option>
            ))}
          </select>
          {selectedBook && (
            <p className="text-sm font-semibold text-indigo-500">
              {hasExtractedText
                ? '✅ Text extracted - will use actual book content'
                : '⚠️ No text extracted - will use description only'}
              {selectedBook.page_count && ` • ${selectedBook.page_count} pages`}
            </p>
          )}
        </div>

        {/* Quiz Type */}
        <div className="space-y-2">
          <label className="text-lg font-black text-indigo-700">📝 Quiz Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQuizType('classroom')}
              className={`rounded-2xl border-4 px-6 py-4 text-lg font-bold transition ${
                quizType === 'classroom'
                  ? 'border-blue-400 bg-blue-100 text-blue-900'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              🏫 Classroom Quiz
            </button>
            <button
              type="button"
              onClick={() => setQuizType('checkpoint')}
              className={`rounded-2xl border-4 px-6 py-4 text-lg font-bold transition ${
                quizType === 'checkpoint'
                  ? 'border-green-400 bg-green-100 text-green-900'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-green-300'
              }`}
            >
              🎯 Checkpoint Quiz
            </button>
          </div>
        </div>

        {/* Page Range Option */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="usePageRange"
              checked={usePageRange}
              onChange={(e) => setUsePageRange(e.target.checked)}
              className="h-6 w-6 rounded border-4 border-indigo-300"
            />
            <label htmlFor="usePageRange" className="text-lg font-black text-indigo-700">
              📖 Use Specific Page Range
            </label>
          </div>

          {usePageRange && (
            <div className="grid grid-cols-2 gap-4 rounded-2xl border-4 border-indigo-200 bg-indigo-50 p-4">
              <div>
                <label className="text-sm font-bold text-indigo-600">Start Page</label>
                <input
                  type="number"
                  min={1}
                  max={maxPage}
                  value={pageRangeStart}
                  onChange={(e) => setPageRangeStart(Number(e.target.value))}
                  className="w-full rounded-xl border-2 border-indigo-300 px-4 py-2 font-bold"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-indigo-600">End Page</label>
                <input
                  type="number"
                  min={pageRangeStart}
                  max={maxPage}
                  value={pageRangeEnd}
                  onChange={(e) => setPageRangeEnd(Number(e.target.value))}
                  className="w-full rounded-xl border-2 border-indigo-300 px-4 py-2 font-bold"
                />
              </div>
            </div>
          )}
        </div>

        {/* Checkpoint Page (only for checkpoint quizzes) */}
        {quizType === 'checkpoint' && (
          <div className="space-y-2">
            <label className="text-lg font-black text-green-700">🎯 Checkpoint Page Number</label>
            <input
              type="number"
              min={1}
              max={maxPage}
              value={checkpointPage}
              onChange={(e) => setCheckpointPage(Number(e.target.value))}
              className="w-full rounded-2xl border-4 border-green-300 bg-white px-5 py-4 text-lg font-bold"
            />
            <p className="text-sm font-semibold text-green-600">
              Students must complete this quiz when they reach page {checkpointPage}
            </p>
          </div>
        )}

        {/* Question Count */}
        <div className="space-y-2">
          <label className="text-lg font-black text-indigo-700">❓ Number of Questions</label>
          <input
            type="number"
            min={3}
            max={15}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full rounded-2xl border-4 border-indigo-300 bg-white px-5 py-4 text-lg font-bold"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={status === 'loading' || !bookId}
          className="w-full rounded-2xl border-4 border-purple-300 bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-5 text-2xl font-black text-white shadow-xl transition hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
        >
          {status === 'loading' ? '✨ Generating Quiz...' : '🎲 Generate Quiz'}
        </button>

        {quizType === 'checkpoint' && (
          <button
            type="button"
            onClick={handleAutoCheckpoints}
            disabled={status === 'loading' || !bookId}
            className="w-full rounded-2xl border-4 border-green-300 bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 text-lg font-black text-white shadow-lg transition hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
          >
            🤖 Auto-Suggest Checkpoints
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border-4 border-red-300 bg-red-50 px-5 py-4">
          <p className="text-center text-lg font-bold text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Success Message */}
      {quizLink && (
        <div className="space-y-3 rounded-2xl border-4 border-green-300 bg-green-50 px-5 py-5">
          <p className="text-xl font-black text-green-700">✅ Quiz Created Successfully!</p>
          {contentSource && (
            <p className="text-sm font-semibold text-green-600">Content source: {contentSource}</p>
          )}
          <Link
            href={quizLink}
            className="inline-block rounded-full border-4 border-green-400 bg-green-500 px-6 py-3 text-lg font-black text-white shadow-lg transition hover:bg-green-600"
          >
            🎮 Preview Quiz
          </Link>
        </div>
      )}
    </section>
  );
};
