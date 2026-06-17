"use client";

import Link from "next/link";
import type { ProfileGamificationStats } from "@/types/database";

type ReadingJourneySectionProps = {
  stats: ProfileGamificationStats | null;
  currentBook?: {
    id: number;
    title: string;
    author?: string;
    cover_url?: string;
    current_page: number;
    total_pages?: number | null;
    progress_percentage: number;
  } | null;
  showTitle?: boolean;
};

export function ReadingJourneySection({
  stats,
  currentBook,
  showTitle = true,
}: ReadingJourneySectionProps) {
  if (!stats) {
    return (
      <section className="rounded-[28px] border border-[#eadfda] bg-white/90 p-6 card-shadow">
        {showTitle && (
          <div className="mb-4">
            <h2 className="heading-font text-2xl font-bold text-[#7E1518]">
              Your Reading Journey
            </h2>
            <p className="text-sm leading-6 text-[#5d4b4c]">
              Start reading to track your progress
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-dashed border-[#D6A13A]/60 bg-[#FBF2DF]/40 p-8 text-center">
          <p className="text-sm leading-6 text-[#5d4b4c]">
            Begin your reading journey to see your stats here
          </p>
          <Link
            href="/dashboard/library"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#7E1518] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#681114]"
          >
            Browse Library →
          </Link>
        </div>
      </section>
    );
  }

  // Defensive format helper that never calls toLocaleString on unknown inputs
  const formatNumber = (value: unknown) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    return new Intl.NumberFormat().format(numeric);
  };

  const totalXp = Number(
    // Accept both xp and legacy total_xp shapes
    (stats as unknown as { total_xp?: number }).total_xp ?? stats.xp ?? 0,
  );
  const level = stats.level ?? 1;
  const readingStreak = stats.reading_streak ?? 0;
  const longestStreak = stats.longest_streak ?? 0;
  const booksCompleted = stats.total_books_completed ?? 0;
  const pagesRead = stats.total_pages_read ?? 0;
  const xpToNextLevel = Math.max(
    Number(
      (stats as unknown as { next_level_min_xp?: number; total_xp?: number })
        .next_level_min_xp &&
        (stats as unknown as { total_xp?: number }).total_xp
        ? (stats as unknown as { next_level_min_xp?: number })
            .next_level_min_xp! -
            ((stats as unknown as { total_xp?: number }).total_xp ?? 0)
        : (stats.xp_to_next_level ?? 0),
    ),
    0,
  );
  const levelProgress = Math.min(
    100,
    Math.max(
      // Accept legacy current/next level min xp shape too
      (stats as unknown as { xp_progress_percent?: number })
        .xp_progress_percent ??
        (() => {
          const currentMin = (
            stats as unknown as { current_level_min_xp?: number }
          ).current_level_min_xp;
          const nextMin = (stats as unknown as { next_level_min_xp?: number })
            .next_level_min_xp;
          const total =
            (stats as unknown as { total_xp?: number }).total_xp ??
            stats.xp ??
            0;
          if (
            typeof currentMin === "number" &&
            typeof nextMin === "number" &&
            nextMin > currentMin
          ) {
            return Math.round(
              ((total - currentMin) / (nextMin - currentMin)) * 100,
            );
          }
          return stats.xp_progress_percent ?? 0;
        })(),
      0,
    ),
  );

  return (
    <section className="space-y-4">
      {showTitle && (
        <div>
          <h2 className="heading-font text-2xl font-bold text-[#7E1518]">
            Your Reading Journey
          </h2>
          <p className="text-sm leading-6 text-[#5d4b4c]">
            Track your progress and achievements
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Level & XP Card */}
        <div className="rounded-[28px] border border-[#eadfda] bg-white p-5 card-shadow">
          <div className="mb-2 flex items-center justify-between">
            <p className="heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#7E1518]">
              Level
            </p>
            <div className="rounded-full bg-[#F5E7E8] px-3 py-1 text-sm font-bold text-[#7E1518]">
              {level}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="heading-font text-3xl font-extrabold text-[#241718]">
                {formatNumber(totalXp)}
              </p>
              <p className="text-sm font-medium text-[#7E1518]">XP</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-[#7E1518] transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <p className="text-xs text-[#6f6061]">
              {formatNumber(xpToNextLevel)} XP to Level {level + 1}
            </p>
          </div>
        </div>

        {/* Reading Streak Card */}
        <div className="rounded-[28px] border border-[#D6A13A]/30 bg-[#FBF2DF]/55 p-5 card-shadow">
          <p className="heading-font mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7a5311]">
            Reading Streak
          </p>
          <div className="flex items-baseline gap-2">
            <p className="heading-font text-4xl font-extrabold text-[#D6A13A]">
              {readingStreak}
            </p>
          </div>
          <p className="mt-2 text-xs text-[#7a5311]">
            {readingStreak === 0
              ? "Start reading to begin your streak!"
              : readingStreak === 1
                ? "Keep it going!"
                : `Best: ${longestStreak} days`}
          </p>
        </div>

        {/* Books Read Card */}
        <div className="rounded-[28px] border border-[#6F8B6A]/25 bg-[#EDF3EB]/70 p-5 card-shadow">
          <p className="heading-font mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#486142]">
            Books Finished
          </p>
          <div className="flex items-baseline gap-2">
            <p className="heading-font text-4xl font-extrabold text-[#6F8B6A]">
              {booksCompleted}
            </p>
          </div>
          <p className="mt-2 text-xs text-[#486142]">
            {formatNumber(pagesRead)} pages read total
          </p>
        </div>

        {/* Current Reading Card */}
        {currentBook ? (
          <Link
            href={`/dashboard/student/read/${currentBook.id}?page=${currentBook.current_page}`}
            className="group rounded-[28px] border border-[#B94A4E]/20 bg-[#F8EAEB]/70 p-5 card-shadow transition hover:-translate-y-0.5"
          >
            <p className="heading-font mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#B94A4E]">
              Currently Reading
            </p>
            <p className="heading-font line-clamp-2 text-sm font-bold leading-tight text-[#241718]">
              {currentBook.title}
            </p>
            {currentBook.author && (
              <p className="mt-1 text-xs text-[#5d4b4c]">
                {currentBook.author}
              </p>
            )}
            <div className="mt-3 space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-[#B94A4E] transition-all duration-500"
                  style={{ width: `${currentBook.progress_percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#B94A4E]">
                <span>
                  Page {currentBook.current_page}
                  {currentBook.total_pages && ` of ${currentBook.total_pages}`}
                </span>
                <span>{currentBook.progress_percentage.toFixed(0)}%</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#B94A4E]/30 bg-white/70 p-5 card-shadow">
            <p className="heading-font mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#B94A4E]">
              Currently Reading
            </p>
            <p className="text-sm text-[#6f6061]">No book in progress</p>
            <Link
              href="/dashboard/library"
              className="mt-3 inline-block heading-font text-xs font-bold text-[#7E1518] hover:text-[#681114]"
            >
              Browse library →
            </Link>
          </div>
        )}
      </div>

      {/* View Full Progress Link */}
      <div className="flex justify-center">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 heading-font text-sm font-bold text-[#7E1518] hover:text-[#681114]"
        >
          View full reading dashboard →
        </Link>
      </div>
    </section>
  );
}
