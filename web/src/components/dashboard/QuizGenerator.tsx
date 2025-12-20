'use client';

import { useState } from 'react';
import Link from 'next/link';
import { generateQuizForBook } from '@/app/(dashboard)/dashboard/librarian/actions';

type QuizGeneratorProps = {
  books: Array<{ id: number; title: string; description: string | null }>;
};

export const QuizGenerator = ({ books }: QuizGeneratorProps) => {
  const [bookId, setBookId] = useState<number | null>(books[0]?.id ?? null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quizLink, setQuizLink] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!bookId) {
      setError('Select a book first.');
      return;
    }

    setStatus('loading');
    setError(null);
    setQuizLink(null);

    try {
      const result = await generateQuizForBook({ bookId });
      setQuizLink(`/dashboard/student/quiz/${result.quizId}`);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate quiz.';
      setError(message);
      setStatus('idle');
    }
  };

  return (
    <section className="pop-in space-y-5 rounded-3xl border-4 border-pink-300 bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50 p-8 shadow-2xl">
      <div>
        <div className="mb-3 inline-block rounded-2xl border-4 border-yellow-300 bg-yellow-400 px-4 py-2">
          <p className="text-base font-black uppercase tracking-wide text-yellow-900">✨ Magic Quiz Time</p>
        </div>
        <h2 className="text-3xl font-black text-purple-900">🤖 AI Quiz Generator</h2>
        <p className="text-lg font-semibold text-purple-600">Pick a book and let AI create a fun quiz for you!</p>
      </div>

      <div className="space-y-3">
        <label className="text-lg font-black text-purple-700">📚 Choose Your Book</label>
        <select
          className="w-full rounded-2xl border-4 border-purple-300 bg-white px-5 py-4 text-lg font-bold text-purple-900 outline-none transition-all"
          value={bookId ?? ''}
          onChange={(event) => setBookId(Number(event.target.value))}
        >
          {books.length ? (
            books.map((book: any) => (
              <option key={book.id} value={book.id} className="bg-white text-purple-900">
                {book.title}
              </option>
            ))
          ) : (
            <option value="" disabled>
              📖 Upload a book first
            </option>
          )}
        </select>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={status === 'loading' || !bookId}
        className="btn-3d btn-squish w-full rounded-2xl border-4 border-blue-300 bg-gradient-to-r from-blue-400 to-cyan-500 px-8 py-5 text-2xl font-black text-white shadow-2xl transition hover:from-blue-500 hover:to-cyan-600 disabled:pointer-events-none disabled:opacity-50"
      >
        {status === 'loading' ? '✨ Creating Your Quiz...' : '🎲 Generate Quiz!'}
      </button>

      {error ? (
        <div className="rounded-2xl border-4 border-red-300 bg-red-50 px-5 py-4">
          <p className="text-center text-lg font-bold text-red-600">⚠️ {error}</p>
        </div>
      ) : null}
      {quizLink ? (
        <div className="rounded-2xl border-4 border-green-300 bg-green-50 px-5 py-4">
          <p className="text-lg font-bold text-green-700">
            ✅ Quiz created!{' '}
            <Link href={quizLink} className="text-green-800 underline decoration-wavy underline-offset-4 hover:text-green-900">
              🎮 Play it now!
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
};
