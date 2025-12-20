'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { assignBookToClass, removeBookFromClass } from '@/app/(dashboard)/dashboard/teacher/actions';

type AssignedBook = {
  book_id: number;
  title: string;
  author: string | null;
  cover_url: string | null;
  assigned_at: string | null;
};

type AvailableBook = {
  id: number;
  title: string;
  author: string | null;
  cover_url: string | null;
};

type ClassReadingListProps = {
  classId: number;
  assignedBooks: AssignedBook[];
  availableBooks: AvailableBook[];
};

export const ClassReadingList = ({ classId, assignedBooks, availableBooks }: ClassReadingListProps) => {
  const router = useRouter();
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const datalistId = `class-reading-books-${classId}`;

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsAssigning(true);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const bookTitle = String(formData.get('bookTitle') ?? '').trim();
    const selectedBook = availableBooks.find((book) => book.title.toLowerCase() === bookTitle.toLowerCase());

    if (!selectedBook) {
      setError('Please pick a book from the list.');
      setIsAssigning(false);
      return;
    }

    try {
      await assignBookToClass({ classId, bookId: selectedBook.id });
      formElement.reset();
      setIsFormOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to assign book.';
      setError(message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (bookId: number) => {
    setError(null);
    try {
      await removeBookFromClass({ classId, bookId });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to remove book.';
      setError(message);
    }
  };

  return (
    <div className="space-y-4 rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_rgba(59,130,246,0.18)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Reading List</p>
          <h2 className="text-xl font-black text-indigo-950">Books for this classroom</h2>
          <p className="text-sm font-medium text-indigo-500">Assign titles that every student should read.</p>
        </div>
        <button
          type="button"
          onClick={() => availableBooks.length > 0 && setIsFormOpen((value) => !value)}
          disabled={availableBooks.length === 0}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-[0_12px_30px_rgba(59,130,246,0.45)] transition hover:shadow-[0_16px_35px_rgba(59,130,246,0.5)] disabled:opacity-40"
          aria-label="Add book to reading list"
        >
          +
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleAssign} className="flex flex-col gap-3 md:flex-row">
          <input
            name="bookTitle"
            list={datalistId}
            required
            placeholder={availableBooks.length === 0 ? 'No available books' : 'Start typing a book title...'}
            className="w-full rounded-2xl border border-sky-200 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_12px_30px_rgba(59,130,246,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-50"
            disabled={availableBooks.length === 0}
          />
          <datalist id={datalistId}>
            {availableBooks.map((book: any) => (
              <option key={book.id} value={book.title} label={book.author ?? undefined} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={isAssigning || availableBooks.length === 0}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-400 px-6 py-3 font-semibold text-white shadow-[0_15px_35px_rgba(59,130,246,0.4)] transition hover:shadow-[0_20px_40px_rgba(59,130,246,0.5)] disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : 'Add Book'}
          </button>
        </form>
      )}

      {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {assignedBooks.map((book: any) => (
          <div
            key={book.book_id}
            className="flex gap-4 rounded-2xl border border-indigo-100 bg-white/90 p-4 shadow-[0_16px_40px_rgba(79,70,229,0.15)]"
          >
            {book.cover_url ? (
              <div className="relative h-20 w-16 overflow-hidden rounded-xl border border-indigo-100">
                <Image src={book.cover_url} alt={book.title} fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <div className="flex h-20 w-16 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-sm font-bold text-indigo-400">
                📘
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <p className="font-semibold text-indigo-900">{book.title}</p>
              <p className="text-sm text-indigo-500">{book.author ?? 'Unknown author'}</p>
              <button
                type="button"
                onClick={() => handleRemove(book.book_id)}
                className="mt-auto w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-200"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {assignedBooks.length === 0 && (
          <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center text-indigo-400 md:col-span-2">
            No books assigned yet. Use the + button to build this class reading list.
          </p>
        )}
      </div>
    </div>
  );
};
