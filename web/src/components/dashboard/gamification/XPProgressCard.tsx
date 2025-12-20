"use client";

import { getLevelTitle } from "@/lib/gamification-utils";
import type { ProfileGamificationStats } from "@/types/database";

interface XPProgressCardProps {
  stats: ProfileGamificationStats;
  className?: string;
}

export function XPProgressCard({ stats, className = "" }: XPProgressCardProps) {
  const title = getLevelTitle(stats.level);

  return (
    <div
      className={`rounded-[28px] border border-white/70 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-[0_20px_60px_rgba(147,118,255,0.35)] ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/70">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">Level {stats.level}</span>
          </div>
          <p className="text-sm text-white/80">
            {stats.xp.toLocaleString()} XP total
          </p>
        </div>

        {/* Level Badge Circle */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl font-black shadow-inner">
          {stats.level}
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-white/70">
          <span>Progress to Level {stats.level + 1}</span>
          <span>{stats.xp_progress_percent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 transition-all duration-500"
            style={{ width: `${stats.xp_progress_percent}%` }}
          />
        </div>
        <p className="text-right text-xs text-white/60">
          {stats.xp_to_next_level.toLocaleString()} XP to next level
        </p>
      </div>
    </div>
  );
}
