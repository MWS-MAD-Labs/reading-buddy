"use client";

import type { ProfileGamificationStats } from "@/types/database";

interface StatsGridProps {
  stats: ProfileGamificationStats;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_8px_25px_rgba(147,118,255,0.12)]">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${color}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-indigo-950">{value}</p>
          <p className="text-xs text-indigo-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function StatsGrid({ stats, className = "" }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
      <StatCard
        icon="🔥"
        label="Day Streak"
        value={stats.reading_streak}
        color="bg-orange-100"
      />
      <StatCard
        icon="📚"
        label="Books Read"
        value={stats.total_books_completed}
        color="bg-blue-100"
      />
      <StatCard
        icon="📄"
        label="Pages Read"
        value={stats.total_pages_read.toLocaleString()}
        color="bg-green-100"
      />
      <StatCard
        icon="✅"
        label="Quizzes Done"
        value={stats.total_quizzes_completed}
        color="bg-purple-100"
      />
    </div>
  );
}

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakCard({
  currentStreak,
  longestStreak,
  className = "",
}: StreakCardProps) {
  // Generate last 7 days streak indicator
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();

  return (
    <div
      className={`rounded-[28px] border border-white/70 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6 shadow-[0_15px_40px_rgba(251,146,60,0.2)] ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-orange-500">
            Reading Streak
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-black text-orange-600">
              {currentStreak}
            </span>
            <span className="text-lg text-orange-400">
              {currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
        <div className="text-4xl">🔥</div>
      </div>

      {/* Week indicator */}
      <div className="mt-4 flex justify-between gap-1">
        {days.map((day, i) => {
          const isToday = i === today;
          const isPast = i < today;
          const isActive = isPast || (isToday && currentStreak > 0);

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-orange-400 text-white"
                    : isToday
                      ? "border-2 border-dashed border-orange-300 text-orange-400"
                      : "bg-orange-100 text-orange-300"
                }`}
              >
                {isActive && currentStreak > 0 ? "✓" : day}
              </div>
            </div>
          );
        })}
      </div>

      {longestStreak > 0 && (
        <p className="mt-3 text-center text-xs text-orange-400">
          Best streak: {longestStreak} days
        </p>
      )}
    </div>
  );
}
