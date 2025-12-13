"use client";

import Link from "next/link";
import type { ProfileGamificationStats } from "@/types/database";

type StudentStatsCardsProps = {
  stats: ProfileGamificationStats;
  currentBookTitle?: string;
  currentBookProgress?: number;
  currentBookId?: number;
};

export function StudentStatsCards({
  stats,
  currentBookTitle,
  currentBookProgress,
  currentBookId,
}: StudentStatsCardsProps) {
  const formatNumber = (value: unknown) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0";
    return new Intl.NumberFormat().format(numeric);
  };

  const totalXp = stats.xp ?? 0;
  const levelProgress = Math.min(
    100,
    Math.max(stats.xp_progress_percent ?? 0, 0),
  );
  const xpToNextLevel = Math.max(stats.xp_to_next_level ?? 0, 0);

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* XP & Level Card */}
      <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 shadow-[0_15px_40px_rgba(147,118,255,0.2)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-500">
            Level
          </p>
          <div className="rounded-full bg-purple-400 px-3 py-1 text-sm font-black text-white shadow-md">
            {stats.level}
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
            {formatNumber(xpToNextLevel)} XP to Level {stats.level + 1}
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
            {stats.reading_streak}
          </p>
          <p className="text-lg font-bold text-orange-400">🔥</p>
        </div>
        <p className="mt-2 text-xs text-orange-500">
          {stats.reading_streak === 0
            ? "Start reading to begin your streak!"
            : stats.reading_streak === 1
              ? "Keep it going!"
              : `Best: ${stats.longest_streak} days`}
        </p>
      </div>

      {/* Books Read Card */}
      <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-[0_15px_40px_rgba(16,185,129,0.2)]">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
            Books Finished
          </p>
          <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black text-emerald-600">
              {formatNumber(stats.total_books_completed ?? 0)}
            </p>
            <p className="text-lg font-bold text-emerald-400">📚</p>
          </div>
          <p className="mt-2 text-xs text-emerald-500">
            {formatNumber(stats.total_pages_read ?? 0)} pages read total
          </p>
        </div>

      {/* Current Reading Card */}
      {currentBookTitle && currentBookId ? (
        <Link
          href={`/dashboard/student/read/${currentBookId}`}
          className="group rounded-[28px] border border-white/70 bg-gradient-to-br from-rose-50 to-pink-50 p-5 shadow-[0_15px_40px_rgba(244,63,94,0.2)] transition hover:scale-105"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-500">
            Currently Reading
          </p>
          <p className="text-sm font-black leading-tight text-rose-900 line-clamp-2">
            {currentBookTitle}
          </p>
          <div className="mt-3 space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all duration-500"
                style={{ width: `${currentBookProgress || 0}%` }}
              />
            </div>
            <p className="text-xs text-rose-500">
              {currentBookProgress?.toFixed(0) || 0}% complete
            </p>
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
  );
}
