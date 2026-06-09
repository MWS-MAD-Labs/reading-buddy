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
      className={`rounded-[28px] border border-[#7E1518]/15 bg-[#F5E7E8]/70 p-6 card-shadow ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#7E1518]">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="heading-font text-4xl font-extrabold text-[#7E1518]">
              Level {stats.level}
            </span>
          </div>
          <p className="text-sm leading-6 text-[#5d4b4c]">
            {stats.xp.toLocaleString()} XP total
          </p>
        </div>

        <div className="heading-font flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-[#7E1518]/15 bg-white text-3xl font-extrabold text-[#7E1518]">
          {stats.level}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-[#6f6061]">
          <span>Progress to Level {stats.level + 1}</span>
          <span>{stats.xp_progress_percent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-[#7E1518] transition-all duration-500"
            style={{ width: `${stats.xp_progress_percent}%` }}
          />
        </div>
        <p className="text-right text-xs text-[#6f6061]">
          {stats.xp_to_next_level.toLocaleString()} XP to next level
        </p>
      </div>
    </div>
  );
}
