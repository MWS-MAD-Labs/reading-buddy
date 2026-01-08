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

    // Get book details
    const bookResult = await queryWithContext(
        user.userId,
        `SELECT id, title, author, cover_url, page_count FROM books WHERE id = $1`,
        [bookId]
    );

    const book = bookResult.rows[0];
    if (!book) {
        notFound();
    }

    // Get journal data
    const [entriesResult, bookJournal] = await Promise.all([
        getJournalEntries({ bookId, limit: 100 }),
        getBookJournal(bookId),
    ]);

    // Get reading progress
    const progressResult = await queryWithContext(
        user.userId,
        `SELECT current_page, completed, completed_at, started_at 
     FROM student_books 
     WHERE student_id = $1 AND book_id = $2`,
        [user.profileId, bookId]
    );
    const progress = progressResult.rows[0];

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link
                href="/dashboard/journal"
                className="inline-flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-700"
            >
                ← Back to Journal
            </Link>

            {/* Book Header */}
            <BookJournalHeader
                book={book}
                progress={progress}
                bookJournal={bookJournal}
            />

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <Link
                    href={`/dashboard/student/read/${bookId}${progress?.current_page ? `?page=${progress.current_page}` : ""}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                >
                    📖 Continue Reading
                </Link>
            </div>

            {/* Notes Timeline */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-indigo-950">My Notes</h2>
                    <p className="text-sm text-indigo-400">
                        {entriesResult.entries.length} notes
                    </p>
                </div>

                {entriesResult.entries.length > 0 ? (
                    <JournalTimeline entries={entriesResult.entries} />
                ) : (
                    <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/80 p-8 text-center">
                        <div className="mb-2 text-4xl">📝</div>
                        <p className="text-sm text-indigo-500">
                            No notes yet for this book. Start reading and add some thoughts!
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
