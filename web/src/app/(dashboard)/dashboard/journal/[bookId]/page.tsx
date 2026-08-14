import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import {
  getJournalEntries,
  getBookJournal,
} from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { JournalTimeline } from "@/components/dashboard/journal/JournalTimeline";
import { BookJournalHeader } from "@/components/dashboard/journal/BookJournalHeader";
import { JournalEntryComposer } from "@/components/dashboard/journal/JournalEntryComposer";
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function BookJournalPage({ params }: PageProps) {
  const awaitedParams = await params;
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    redirect("/login");
  }

  const bookId = Number(awaitedParams.bookId);
  if (Number.isNaN(bookId)) {
    notFound();
  }

  const bookResult = await queryWithContext(
    user.userId,
    `SELECT id, title, author, cover_url, page_count FROM books WHERE id = $1`,
    [bookId],
  );

  const book = bookResult.rows[0];
  if (!book) {
    notFound();
  }

  const [entriesResult, bookJournal] = await Promise.all([
    getJournalEntries({ bookId, limit: 100 }),
    getBookJournal(bookId),
  ]);

  const progressResult = await queryWithContext(
    user.userId,
    `SELECT current_page, completed, completed_at, started_at
     FROM student_books
     WHERE student_id = $1 AND book_id = $2`,
    [user.profileId, bookId],
  );
  const progress = progressResult.rows[0];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/journal"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "w-fit no-underline",
        )}
      >
        Back to Journal
      </Link>

      <BookJournalHeader
        book={book}
        progress={progress}
        bookJournal={bookJournal}
      />

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/student/read/${bookId}${progress?.current_page ? `?page=${progress.current_page}` : ""}`}
          className={cn(
            buttonVariants({ variant: "primary", size: "md" }),
            "no-underline",
          )}
        >
          Continue Reading
        </Link>
        <JournalEntryComposer
          triggerLabel="Add Note"
          title="Add Note"
          description="Save a note for this book. Add a page number if it belongs to a specific page."
          mode="book-entry"
          fixedBook={{
            id: book.id,
            title: book.title,
            author: book.author ?? null,
            cover_url: book.cover_url ?? null,
            current_page: progress?.current_page ?? null,
            completed: progress?.completed ?? null,
          }}
          defaultEntryType="note"
          defaultPageNumber={progress?.current_page}
          triggerVariant="outline"
        />
        <JournalEntryComposer
          triggerLabel="Save Quote"
          title="Save Quote"
          description="Capture a quote from this book and optionally attach a page number."
          mode="book-entry"
          fixedBook={{
            id: book.id,
            title: book.title,
            author: book.author ?? null,
            cover_url: book.cover_url ?? null,
            current_page: progress?.current_page ?? null,
            completed: progress?.completed ?? null,
          }}
          defaultEntryType="quote"
          defaultPageNumber={progress?.current_page}
          triggerVariant="outline"
        />
        <JournalEntryComposer
          triggerLabel="Ask Question"
          title="Ask Question"
          description="Save a question this book raised for you."
          mode="book-entry"
          fixedBook={{
            id: book.id,
            title: book.title,
            author: book.author ?? null,
            cover_url: book.cover_url ?? null,
            current_page: progress?.current_page ?? null,
            completed: progress?.completed ?? null,
          }}
          defaultEntryType="question"
          defaultPageNumber={progress?.current_page}
          triggerVariant="outline"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge variant="neutral" size="sm">
              Book journal
            </Badge>
            <h2 className="heading-font mt-2 text-xl font-bold text-[#7E1518]">
              My Book Entries
            </h2>
          </div>
          <Badge variant="outline" size="sm">
            {entriesResult.entries.length} entries
          </Badge>
        </div>

        {entriesResult.entries.length > 0 ? (
          <JournalTimeline entries={entriesResult.entries} />
        ) : (
          <Card
            variant="playful"
            padding="cozy"
            className="border-dashed border-[#D6A13A]/60 text-center"
          >
            <Badge variant="amber" size="sm" className="mb-3">
              Notes
            </Badge>
            <CardTitle className="text-lg text-[#7E1518]">
              No book entries yet
            </CardTitle>
            <CardDescription>
              Start reading or add a note, quote, or question for this book.
            </CardDescription>
          </Card>
        )}
      </section>
    </div>
  );
}
