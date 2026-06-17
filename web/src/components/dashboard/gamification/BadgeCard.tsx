"use client";

import Image from "next/image";
import { Award } from "lucide-react";
import type { Badge, BadgeTier } from "@/types/database";

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  earnedAt?: string | null;
  progress?: number;
  currentValue?: number;
  targetValue?: number;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

const tierColors: Record<
  BadgeTier,
  { bg: string; border: string; text: string }
> = {
  bronze: {
    bg: "bg-[#FBF2DF]/65",
    border: "border-[#D6A13A]/35",
    text: "text-[#7a5311]",
  },
  silver: {
    bg: "bg-[#EFF8FE]/75",
    border: "border-[#B8DDF8]/60",
    text: "text-[#25638e]",
  },
  gold: {
    bg: "bg-[#FBF2DF]/85",
    border: "border-[#D6A13A]/55",
    text: "text-[#7a5311]",
  },
  platinum: {
    bg: "bg-[#EDF3EB]/80",
    border: "border-[#6F8B6A]/30",
    text: "text-[#486142]",
  },
  special: {
    bg: "bg-[#F8EAEB]/80",
    border: "border-[#B94A4E]/30",
    text: "text-[#B94A4E]",
  },
};

const tierLabels: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  special: "Special",
};

export function BadgeCard({
  badge,
  earned,
  earnedAt,
  progress = 0,
  currentValue = 0,
  targetValue = 1,
  showProgress = true,
  size = "md",
}: BadgeCardProps) {
  const tier = badge.tier || "bronze";
  const colors = tierColors[tier];

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  };

  const iconSizes = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={`relative rounded-2xl border ${colors.border} ${colors.bg} ${sizeClasses[size]} card-shadow ${
        !earned ? "opacity-70 grayscale" : ""
      } transition-all hover:-translate-y-0.5`}
    >
      <div className="absolute -top-2 left-3">
        <span
          className={`heading-font rounded-full border ${colors.border} bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${colors.text}`}
        >
          {tierLabels[tier]}
        </span>
      </div>

      <div className="mt-2 flex items-start gap-3">
        <div
          className={`flex ${iconSizes[size]} flex-shrink-0 items-center justify-center rounded-full bg-white shadow-inner`}
        >
          {badge.icon_url ? (
            <Image
              src={badge.icon_url}
              alt={badge.name}
              width={56}
              height={56}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <Award className={`h-6 w-6 ${colors.text}`} />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className={`heading-font font-bold ${colors.text}`}>
            {badge.name}
            {earned && <span className="ml-1 text-[#6F8B6A]">✓</span>}
          </h3>
          <p className="text-xs leading-5 text-[#5d4b4c]">
            {badge.description}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="heading-font text-xs font-bold text-[#7E1518]">
              +{badge.xp_reward} XP
            </span>
            {earnedAt && (
              <span className="text-xs text-[#6f6061]">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {!earned && showProgress && progress > 0 && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-[#7E1518] transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-[#6f6061]">
                {currentValue} / {targetValue}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BadgeGridProps {
  badges: Array<{
    badge: Badge;
    earned: boolean;
    earnedAt: string | null;
    progress: number;
    currentValue: number;
    targetValue: number;
  }>;
  title?: string;
  showAll?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function BadgeGrid({
  badges,
  title = "Badges",
  showAll = false,
  maxDisplay = 6,
  className = "",
}: BadgeGridProps) {
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return b.progress - a.progress;
  });

  const displayBadges = showAll
    ? sortedBadges
    : sortedBadges.slice(0, maxDisplay);
  const hiddenCount = badges.length - displayBadges.length;
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-font text-xl font-bold text-[#7E1518]">
            {title}
          </h2>
          <p className="text-sm leading-6 text-[#5d4b4c]">
            {earnedCount} of {badges.length} badges earned
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayBadges.map((item) => (
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

      {hiddenCount > 0 && (
        <p className="text-center text-sm text-[#6f6061]">
          +{hiddenCount} more badges to discover
        </p>
      )}
    </div>
  );
}

interface RecentBadgesProps {
  badges: Array<{
    badge: Badge;
    earnedAt: string;
  }>;
  maxDisplay?: number;
  className?: string;
}

export function RecentBadges({
  badges,
  maxDisplay = 3,
  className = "",
}: RecentBadgesProps) {
  if (badges.length === 0) {
    return null;
  }

  const recentBadges = badges.slice(0, maxDisplay);

  return (
    <div
      className={`rounded-[28px] border border-[#6F8B6A]/25 bg-[#EDF3EB]/75 p-6 card-shadow ${className}`}
    >
      <div className="mb-4">
        <h3 className="heading-font font-bold text-[#486142]">Recent Badges</h3>
      </div>

      <div className="space-y-3">
        {recentBadges.map((item) => (
          <div
            key={item.badge.id}
            className="flex items-center gap-3 rounded-xl border border-[#eadfda] bg-white/85 p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDF3EB] text-lg">
              {item.badge.icon_url ? (
                <Image
                  src={item.badge.icon_url}
                  alt={item.badge.name}
                  width={40}
                  height={40}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <Award className="h-5 w-5 text-[#6F8B6A]" />
              )}
            </div>
            <div className="flex-1">
              <p className="heading-font text-sm font-bold text-[#241718]">
                {item.badge.name}
              </p>
              <p className="text-xs text-[#6f6061]">
                {new Date(item.earnedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="heading-font text-xs font-bold text-[#7E1518]">
              +{item.badge.xp_reward} XP
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
