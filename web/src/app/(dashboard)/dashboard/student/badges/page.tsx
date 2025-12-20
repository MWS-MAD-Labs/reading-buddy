import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBadgesWithProgress,
  getGamificationStats,
} from "@/lib/gamification";
import { BadgeCard } from "@/components/dashboard/gamification";
import type { BadgeCategory } from "@/types/database";

export const dynamic = "force-dynamic";

const categoryLabels: Record<BadgeCategory, { label: string }> = {
  reading: { label: "Reading" },
  quiz: { label: "Quiz" },
  streak: { label: "Streak" },
  milestone: { label: "Milestone" },
  special: { label: "Special" },
  general: { label: "General" },
};

export default async function BadgesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const stats = await getGamificationStats(user.id, user.id);
  const badgesWithProgress = await getBadgesWithProgress(user.id, user.id);

  // Group badges by category
  const badgesByCategory = badgesWithProgress.reduce(
    (acc, item) => {
      const category = item.badge.category || "general";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, typeof badgesWithProgress>,
  );

  // Sort each category: earned first, then by progress
  Object.keys(badgesByCategory).forEach((category: any) => {
    badgesByCategory[category].sort((a, b) => {
      if (a.earned && !b.earned) return -1;
      if (!a.earned && b.earned) return 1;
      return b.progress - a.progress;
    });
  });

  const earnedCount = badgesWithProgress.filter((b: any) => b.earned).length;
  const totalCount = badgesWithProgress.length;

  // Category order for display
  const categoryOrder: BadgeCategory[] = [
    "milestone",
    "reading",
    "quiz",
    "streak",
    "special",
    "general",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2 rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(147,118,255,0.25)]">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/student"
            className="text-indigo-400 hover:text-indigo-600"
          >
            Dashboard
          </Link>
          <span className="text-indigo-300">/</span>
          <span className="text-indigo-600">Badges</span>
        </div>
        <h1 className="text-3xl font-black">My Badges</h1>
        <p className="text-sm text-indigo-500">
          Collect badges by reading books, completing quizzes, and maintaining
          streaks.
        </p>
      </header>

      {/* Summary Card */}
      <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-[0_20px_60px_rgba(147,118,255,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">Badge Collection</p>
            <p className="text-3xl font-black">
              {earnedCount} / {totalCount}
            </p>
            <p className="text-sm text-white/80">badges earned</p>
          </div>

          {stats && (
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {stats.total_books_completed}
                </p>
                <p className="text-xs text-white/70">Books</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {stats.total_quizzes_completed}
                </p>
                <p className="text-xs text-white/70">Quizzes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.reading_streak}</p>
                <p className="text-xs text-white/70">Day Streak</p>
              </div>
            </div>
          )}

          {/* Overall progress */}
          <div className="w-full md:w-48">
            <div className="mb-1 flex justify-between text-xs text-white/70">
              <span>Collection Progress</span>
              <span>{Math.round((earnedCount / totalCount) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400"
                style={{ width: `${(earnedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badges by Category */}
      {categoryOrder.map((category: any) => {
        const badges = badgesByCategory[category];
        if (!badges || badges.length === 0) return null;

        const categoryInfo = categoryLabels[category as BadgeCategory];
        const earnedInCategory = badges.filter((b: any) => b.earned).length;

        return (
          <section
            key={category}
            className="space-y-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(147,118,255,0.18)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-indigo-950">
                  {categoryInfo.label} Badges
                </h2>
                <p className="text-sm text-indigo-500">
                  {earnedInCategory} of {badges.length} earned
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {badges.map((item: any) => (
                <BadgeCard
                  key={item.badge.id}
                  badge={item.badge}
                  earned={item.earned}
                  earnedAt={item.earnedAt}
                  progress={item.progress}
                  currentValue={item.currentValue}
                  targetValue={item.targetValue}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
