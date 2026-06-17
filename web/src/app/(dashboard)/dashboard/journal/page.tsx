import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getJournalEntries, getJournalStats } from "./journal-actions";
import { JournalTimeline } from "@/components/dashboard/journal/JournalTimeline";
import { JournalStats } from "@/components/dashboard/journal/JournalStats";
import { JournalEntryComposer } from "@/components/dashboard/journal/JournalEntryComposer";
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    redirect("/login");
  }

  const [entriesResult, stats] = await Promise.all([
    getJournalEntries({ limit: 50 }),
    getJournalStats(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <Card variant="glow" padding="cozy">
          <CardHeader className="mb-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="amber" size="sm">
                My journal
              </Badge>
              <CardTitle className="mt-3 text-3xl text-[#7E1518]">
                Reading Journal
              </CardTitle>
              <CardDescription>
                Track your reading journey, capture thoughts, and reflect on
                your books.
              </CardDescription>
            </div>
            <JournalEntryComposer
              triggerLabel="New Reflection"
              title="New General Reflection"
              description="Write a journal reflection that is not tied to one specific book. To save a note, quote, or question for a book, open that book and use the reader journal panel."
              mode="reflection"
              triggerVariant="primary"
            />
          </CardHeader>
        </Card>
      </header>

      <JournalStats stats={stats} />

      <section className="flex flex-wrap gap-3" aria-label="Journal shortcuts">
        <Link
          href="/dashboard/library"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "no-underline",
          )}
        >
          Browse Books
        </Link>
        <Link
          href="/dashboard/student"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "no-underline",
          )}
        >
          My Readings
        </Link>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge variant="neutral" size="sm">
              Timeline
            </Badge>
            <h2 className="heading-font mt-2 text-xl font-bold text-[#7E1518]">
              My Timeline
            </h2>
          </div>
          <Badge variant="outline" size="sm">
            {stats.totalEntries}{" "}
            {stats.totalEntries === 1 ? "entry" : "entries"}
          </Badge>
        </div>

        {entriesResult.entries.length > 0 ? (
          <JournalTimeline entries={entriesResult.entries} />
        ) : (
          <Card
            variant="playful"
            padding="spacious"
            className="border-dashed border-[#D6A13A]/60 text-center"
          >
            <Badge variant="amber" size="sm" className="mb-4">
              Start here
            </Badge>
            <CardTitle className="text-lg text-[#7E1518]">
              Your journal is empty
            </CardTitle>
            <CardDescription className="mx-auto mb-6 max-w-md">
              Start reading books and taking notes to fill your reading journal!
            </CardDescription>
            <Link
              href="/dashboard/library"
              className={cn(
                buttonVariants({ variant: "primary", size: "md" }),
                "no-underline",
              )}
            >
              Explore Library
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}
