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
      <section className="rounded-[28px] border border-white/70 bg-gradient-to-br from-slate-50 to-gray-50 p-6 shadow-[0_20px_50px_rgba(100,116,139,0.15)]">
        {showTitle && (
          <div className="mb-4">
            <h2 className="text-2xl font-black text-slate-900">
              📖 Your Reading Journey
            </h2>
            <p className="text-sm text-slate-500">
              Start reading to track your progress
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center">
          <p className="text-sm text-slate-500">
            Begin your reading journey to see your stats here
          </p>
          <Link
            href="/dashboard/library"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
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
        .next_level_min_xp && (stats as unknown as { total_xp?: number }).total_xp
        ? (stats as unknown as { next_level_min_xp?: number }).next_level_min_xp! -
          ((stats as unknown as { total_xp?: number }).total_xp ?? 0)
        : stats.xp_to_next_level ?? 0,
    ),
    0,
  );
  const levelProgress = Math.min(
    100,
    Math.max(
      // Accept legacy current/next level min xp shape too
      (stats as unknown as { xp_progress_percent?: number }).xp_progress_percent ??
        (() => {
          const currentMin = (stats as unknown as { current_level_min_xp?: number })
            .current_level_min_xp;
          const nextMin = (stats as unknown as { next_level_min_xp?: number })
            .next_level_min_xp;
          const total =
            (stats as unknown as { total_xp?: number }).total_xp ?? stats.xp ?? 0;
          if (
            typeof currentMin === "number" &&
            typeof nextMin === "number" &&
            nextMin > currentMin
          ) {
            return Math.round(((total - currentMin) / (nextMin - currentMin)) * 100);
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
          <h2 className="text-2xl font-black text-indigo-900">
            📖 Your Reading Journey
          </h2>
          <p className="text-sm text-indigo-500">
            Track your progress and achievements
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Level & XP Card */}
        <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 shadow-[0_15px_40px_rgba(147,118,255,0.2)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-500">
              Level
            </p>
            <div className="rounded-full bg-purple-400 px-3 py-1 text-sm font-black text-white shadow-md">
              {level}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-indigo-900">
                {formatNumber(totalXp)}
              </p>
              <p className="text-sm font-semibold text-indigo-500">XP</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <p className="text-xs text-indigo-500">
              {formatNumber(xpToNextLevel)} XP to Level {level + 1}
            </p>
          </div>
        </div>

        {/* Reading Streak Card */}
        <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-[0_15px_40px_rgba(251,146,60,0.2)]">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-500">
            Reading Streak
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-orange-600">
              {readingStreak}
            </p>
            <p className="text-lg font-bold text-orange-400">🔥</p>
          </div>
          <p className="mt-2 text-xs text-orange-500">
            {readingStreak === 0
              ? "Start reading to begin your streak!"
              : readingStreak === 1
                ? "Keep it going!"
                : `Best: ${longestStreak} days`}
          </p>
        </div>

        {/* Books Read Card */}
        <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-[0_15px_40px_rgba(16,185,129,0.2)]">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
            Books Finished
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-emerald-600">
              {booksCompleted}
            </p>
            <p className="text-lg font-bold text-emerald-400">📚</p>
          </div>
          <p className="mt-2 text-xs text-emerald-500">
            {formatNumber(pagesRead)} pages read total
          </p>
        </div>

        {/* Current Reading Card */}
        {currentBook ? (
          <Link
            href={`/dashboard/student/read/${currentBook.id}?page=${currentBook.current_page}`}
            className="group rounded-[28px] border border-white/70 bg-gradient-to-br from-rose-50 to-pink-50 p-5 shadow-[0_15px_40px_rgba(244,63,94,0.2)] transition hover:scale-105"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-500">
              Currently Reading
            </p>
            <p className="text-sm font-black leading-tight text-rose-900 line-clamp-2">
              {currentBook.title}
            </p>
            {currentBook.author && (
              <p className="mt-1 text-xs text-rose-600">{currentBook.author}</p>
            )}
            <div className="mt-3 space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all duration-500"
                  style={{ width: `${currentBook.progress_percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-rose-500">
                <span>
                  Page {currentBook.current_page}
                  {currentBook.total_pages && ` of ${currentBook.total_pages}`}
                </span>
                <span>{currentBook.progress_percentage.toFixed(0)}%</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-[28px] border border-dashed border-rose-200 bg-white/60 p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-300">
              Currently Reading
            </p>
            <p className="text-sm text-rose-400">No book in progress</p>
            <Link
              href="/dashboard/library"
              className="mt-3 inline-block text-xs font-semibold text-rose-500 hover:text-rose-600"
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View full reading dashboard →
        </Link>
      </div>
    </section>
  );
}
