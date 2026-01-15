import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getJournalEntries, getJournalStats } from "./journal-actions";
import { JournalTimeline } from "@/components/dashboard/journal/JournalTimeline";
import { JournalStats } from "@/components/dashboard/journal/JournalStats";
import { CreateNoteButton } from "@/components/dashboard/journal/CreateNoteButton";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
    const user = await getCurrentUser();

    if (!user || !user.userId || !user.profileId) {
        redirect("/login");
    }

    // Get journal entries and stats
    const [entriesResult, stats] = await Promise.all([
        getJournalEntries({ limit: 50 }),
        getJournalStats(),
    ]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="space-y-2 rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(147,118,255,0.25)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-amber-500">
                            📓 My Journal
                        </p>
                        <h1 className="text-3xl font-black">Reading Journal</h1>
                        <p className="text-sm text-indigo-500">
                            Track your reading journey, capture thoughts, and reflect on your
                            books.
                        </p>
                    </div>
                    <CreateNoteButton />
                </div>
            </header>

            {/* Stats Overview */}
            <JournalStats stats={stats} />

            {/* Quick Actions */}
            <section className="flex flex-wrap gap-3">
                <Link
                    href="/dashboard/library"
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                    📚 Browse Books
                </Link>
                <Link
                    href="/dashboard/student"
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                    📖 My Readings
                </Link>
            </section>

            {/* Timeline */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-indigo-950">My Timeline</h2>
                    <p className="text-sm text-indigo-400">
                        {stats.totalEntries} {stats.totalEntries === 1 ? "entry" : "entries"}
                    </p>
                </div>

                {entriesResult.entries.length > 0 ? (
                    <JournalTimeline entries={entriesResult.entries} />
                ) : (
                    <div className="rounded-[28px] border border-dashed border-indigo-200 bg-white/80 p-12 text-center">
                        <div className="mx-auto mb-4 text-6xl">📓</div>
                        <h3 className="mb-2 text-lg font-bold text-indigo-950">
                            Your journal is empty
                        </h3>
                        <p className="mb-6 text-sm text-indigo-500">
                            Start reading books and taking notes to fill your reading journal!
                        </p>
                        <Link
                            href="/dashboard/library"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-105"
                        >
                            📚 Explore Library
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}
