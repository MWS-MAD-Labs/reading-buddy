"use client";

import type { ProfileGamificationStats } from "@/types/database";

interface StatsGridProps {
  stats: ProfileGamificationStats;
  className?: string;
}

type Tone = "gold" | "sky" | "sage" | "rose";

interface StatCardProps {
  label: string;
  value: string | number;
  tone: Tone;
}

const toneStyles: Record<Tone, { card: string; label: string; value: string }> =
  {
    gold: {
      card: "border-[#D6A13A]/35 bg-[#FBF2DF]/75",
      label: "text-[#7a5311]",
      value: "text-[#D6A13A]",
    },
    sky: {
      card: "border-[#B8DDF8]/60 bg-[#EFF8FE]/80",
      label: "text-[#25638e]",
      value: "text-[#1F2A44]",
    },
    sage: {
      card: "border-[#6F8B6A]/25 bg-[#EDF3EB]/80",
      label: "text-[#486142]",
      value: "text-[#6F8B6A]",
    },
    rose: {
      card: "border-[#B94A4E]/25 bg-[#F8EAEB]/80",
      label: "text-[#B94A4E]",
      value: "text-[#B94A4E]",
    },
  };

function StatCard({ label, value, tone }: StatCardProps) {
  const styles = toneStyles[tone];
  return (
    <div className={`rounded-2xl border p-4 card-shadow ${styles.card}`}>
      <p
        className={`heading-font text-xs font-bold uppercase tracking-[0.18em] ${styles.label}`}
      >
        {label}
      </p>
      <p
        className={`heading-font mt-2 text-2xl font-extrabold ${styles.value}`}
      >
        {value}
      </p>
    </div>
  );
}

export function StatsGrid({ stats, className = "" }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
      <StatCard label="Day Streak" value={stats.reading_streak} tone="gold" />
      <StatCard
        label="Books Read"
        value={stats.total_books_completed}
        tone="sky"
      />
      <StatCard
        label="Pages Read"
        value={stats.total_pages_read.toLocaleString()}
        tone="sage"
      />
      <StatCard
        label="Quizzes Done"
        value={stats.total_quizzes_completed}
        tone="rose"
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
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();

  return (
    <div
      className={`rounded-[28px] border border-[#D6A13A]/35 bg-[#FBF2DF]/75 p-6 card-shadow ${className}`}
    >
      <div>
        <p className="heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#7a5311]">
          Reading Streak
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="heading-font text-4xl font-extrabold text-[#D6A13A]">
            {currentStreak}
          </span>
          <span className="text-lg text-[#7a5311]">
            {currentStreak === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

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
                    ? "bg-[#D6A13A] text-[#241718]"
                    : isToday
                      ? "border border-dashed border-[#D6A13A] text-[#7a5311]"
                      : "bg-white/70 text-[#9b898a]"
                }`}
              >
                {isActive && currentStreak > 0 ? "✓" : day}
              </div>
            </div>
          );
        })}
      </div>

      {longestStreak > 0 && (
        <p className="mt-3 text-center text-xs text-[#7a5311]">
          Best streak: {longestStreak} days
        </p>
      )}
    </div>
  );
}
