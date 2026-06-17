"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  assignBookToClass,
  removeBookFromClass,
} from "@/app/(dashboard)/dashboard/teacher/actions";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
} from "@/components/ui";

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

export const ClassReadingList = ({
  classId,
  assignedBooks,
  availableBooks,
}: ClassReadingListProps) => {
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
    const bookTitle = String(formData.get("bookTitle") ?? "").trim();
    const selectedBook = availableBooks.find(
      (book) => book.title.toLowerCase() === bookTitle.toLowerCase(),
    );

    if (!selectedBook) {
      setError("Please pick a book from the list.");
      setIsAssigning(false);
      return;
    }

    try {
      await assignBookToClass({ classId, bookId: selectedBook.id });
      formElement.reset();
      setIsFormOpen(false);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to assign book.";
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
      const message =
        err instanceof Error ? err.message : "Unable to remove book.";
      setError(message);
    }
  };

  return (
    <Card variant="frosted" padding="cozy">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="lime">Reading list</Badge>
            <CardTitle className="mt-2">Books for this classroom</CardTitle>
            <CardDescription>
              Assign titles that every student should read.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant={isFormOpen ? "neutral" : "secondary"}
            size="sm"
            onClick={() =>
              availableBooks.length > 0 && setIsFormOpen((value) => !value)
            }
            disabled={availableBooks.length === 0}
          >
            {isFormOpen ? "Close" : "Add book"}
          </Button>
        </div>
      </CardHeader>

      {isFormOpen && (
        <form
          onSubmit={handleAssign}
          className="flex flex-col gap-3 md:flex-row"
        >
          <Input
            name="bookTitle"
            list={datalistId}
            required
            placeholder={
              availableBooks.length === 0
                ? "No available books"
                : "Start typing a book title..."
            }
            disabled={availableBooks.length === 0}
          />
          <datalist id={datalistId}>
            {availableBooks.map((book) => (
              <option
                key={book.id}
                value={book.title}
                label={book.author ?? undefined}
              />
            ))}
          </datalist>
          <Button
            type="submit"
            loading={isAssigning}
            disabled={availableBooks.length === 0}
            className="md:w-fit"
          >
            Add book
          </Button>
        </form>
      )}

      {error && <FieldError className="mt-3">{error}</FieldError>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {assignedBooks.map((book) => (
          <div
            key={book.book_id}
            className="flex gap-4 rounded-2xl border border-[#eadfda] bg-white/90 p-4"
          >
            {book.cover_url ? (
              <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[#eadfda]">
                <Image
                  src={book.cover_url}
                  alt={book.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-[#eadfda] bg-[#fffaf4] text-xs font-bold text-[#7E1518]">
                Book
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="min-w-0">
                <p className="heading-font truncate font-bold text-[#241718]">
                  {book.title}
                </p>
                <p className="text-sm text-[#6f6061]">
                  {book.author ?? "Unknown author"}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleRemove(book.book_id)}
                className="mt-auto w-fit"
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {assignedBooks.length === 0 && (
          <Card
            padding="snug"
            className="border-dashed text-center shadow-none md:col-span-2"
          >
            <CardDescription>
              No books assigned yet. Add a book to build this class reading
              list.
            </CardDescription>
          </Card>
        )}
      </div>
    </Card>
  );
};
