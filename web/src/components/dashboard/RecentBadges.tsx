"use client";

import Image from "next/image";
import Link from "next/link";
import { Award } from "lucide-react";
import type { StudentBadgeWithBadge } from "@/lib/gamification";

type RecentBadgesProps = {
  badges: StudentBadgeWithBadge[];
  totalBadges?: number;
};

function formatDistanceToNow(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function RecentBadges({ badges, totalBadges }: RecentBadgesProps) {
  return (
    <div className="pop-in flex h-full flex-col rounded-[32px] border border-[#eadfda] bg-white/90 p-6 card-shadow">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="heading-font text-2xl font-bold text-[#7E1518]">
            Recent Badges
          </h2>
          <p className="text-sm leading-6 text-[#5d4b4c]">
            Latest reading achievements
          </p>
        </div>
        {totalBadges !== undefined && (
          <div className="flex flex-col items-end">
            <span className="heading-font text-2xl font-extrabold text-[#B94A4E]">
              {totalBadges}
            </span>
            <span className="heading-font text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a5311]">
              Total earned
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4">
        {badges.length > 0 ? (
          badges.map((entry) => (
            <div
              key={entry.id}
              className="group relative flex items-center gap-4 rounded-2xl border border-[#eadfda] bg-white p-4 transition-all hover:border-[#D6A13A]/60"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FBF2DF] shadow-inner">
                {entry.badge.icon_url ? (
                  <Image
                    src={entry.badge.icon_url}
                    alt={entry.badge.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <Award className="h-6 w-6 text-[#D6A13A]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="heading-font truncate font-bold text-[#241718] group-hover:text-[#7E1518]">
                  {entry.badge.name}
                </h3>
                <p className="truncate text-xs text-[#5d4b4c]">
                  {entry.badge.description}
                </p>
              </div>
              <div className="text-right">
                <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-tighter text-[#9b898a]">
                  {formatDistanceToNow(new Date(entry.earned_at))}
                </p>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <span className="heading-font text-[10px] font-bold text-[#B94A4E]">
                    +{entry.badge.xp_reward}
                  </span>
                  <span className="text-[10px] font-bold text-[#7a5311]">
                    XP
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#D6A13A]/60 bg-[#FBF2DF]/35 p-8 text-center">
            <Award className="mb-3 h-8 w-8 text-[#D6A13A]" />
            <p className="text-sm font-bold text-[#7a5311]">
              Your first badge is waiting for you.
            </p>
            <Link
              href="/dashboard/library"
              className="heading-font mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#7E1518] hover:text-[#681114]"
            >
              Start reading →
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/dashboard/student"
          className="heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#7E1518] underline-offset-4 transition hover:text-[#681114] hover:underline"
        >
          View all badges →
        </Link>
      </div>
    </div>
  );
}
