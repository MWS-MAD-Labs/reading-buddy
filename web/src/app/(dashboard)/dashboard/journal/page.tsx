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
      <header className="space-y-2 rounded-[32px] border border-[#D6A13A]/30 bg-gradient-to-br from-white to-[#FBF2DF] p-6 soft-shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="heading-font text-xs font-bold uppercase tracking-[0.24em] text-[#7a5311]">
              My journal
            </p>
            <h1 className="heading-font text-3xl font-extrabold text-[#7E1518]">
              Reading Journal
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#5d4b4c]">
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
          className="heading-font inline-flex items-center gap-2 rounded-full border border-[#7E1518]/20 bg-white px-4 py-2 text-sm font-bold text-[#7E1518] transition hover:bg-[#F5E7E8]"
        >
          📚 Browse Books
        </Link>
        <Link
          href="/dashboard/student"
          className="heading-font inline-flex items-center gap-2 rounded-full border border-[#7E1518]/20 bg-white px-4 py-2 text-sm font-bold text-[#7E1518] transition hover:bg-[#F5E7E8]"
        >
          📖 My Readings
        </Link>
      </section>

      {/* Timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="heading-font text-xl font-bold text-[#7E1518]">
            My Timeline
          </h2>
          <p className="text-sm text-[#6f6061]">
            {stats.totalEntries}{" "}
            {stats.totalEntries === 1 ? "entry" : "entries"}
          </p>
        </div>

        {entriesResult.entries.length > 0 ? (
          <JournalTimeline entries={entriesResult.entries} />
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#D6A13A]/60 bg-white/80 p-12 text-center card-shadow">
            <div className="mx-auto mb-4 text-6xl">📓</div>
            <h3 className="heading-font mb-2 text-lg font-bold text-[#7E1518]">
              Your journal is empty
            </h3>
            <p className="mb-6 text-sm leading-6 text-[#5d4b4c]">
              Start reading books and taking notes to fill your reading journal!
            </p>
            <Link
              href="/dashboard/library"
              className="heading-font inline-flex items-center gap-2 rounded-full bg-[#7E1518] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#681114]"
            >
              📚 Explore Library
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
