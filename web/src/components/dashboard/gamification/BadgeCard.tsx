"use client";

import type { Badge, BadgeTier, BadgeCategory } from "@/types/database";

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

const tierColors: Record<BadgeTier, { bg: string; border: string; text: string }> = {
  bronze: {
    bg: "bg-gradient-to-br from-amber-100 to-orange-100",
    border: "border-amber-300",
    text: "text-amber-700",
  },
  silver: {
    bg: "bg-gradient-to-br from-gray-100 to-slate-200",
    border: "border-gray-400",
    text: "text-gray-700",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-100 to-amber-200",
    border: "border-yellow-500",
    text: "text-yellow-700",
  },
  platinum: {
    bg: "bg-gradient-to-br from-cyan-100 to-blue-200",
    border: "border-cyan-500",
    text: "text-cyan-700",
  },
  special: {
    bg: "bg-gradient-to-br from-purple-100 to-pink-200",
    border: "border-purple-500",
    text: "text-purple-700",
  },
};

const categoryIcons: Record<BadgeCategory, string> = {
  reading: "📖",
  quiz: "📝",
  streak: "🔥",
  milestone: "🏆",
  special: "⭐",
  general: "🎯",
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
  const category = badge.category || "general";
  const colors = tierColors[tier];
  const icon = categoryIcons[category];

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  };

  const iconSizes = {
    sm: "h-10 w-10 text-xl",
    md: "h-14 w-14 text-2xl",
    lg: "h-16 w-16 text-3xl",
  };

  return (
    <div
      className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} ${sizeClasses[size]} ${
        !earned ? "opacity-60 grayscale" : ""
      } transition-all hover:scale-[1.02]`}
    >
      {/* Tier label */}
      <div className="absolute -top-2 left-3">
        <span
          className={`rounded-full ${colors.border} border bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.text}`}
        >
          {tierLabels[tier]}
        </span>
      </div>

      <div className="mt-2 flex items-start gap-3">
        {/* Badge Icon */}
        <div
          className={`flex ${iconSizes[size]} flex-shrink-0 items-center justify-center rounded-full bg-white shadow-md`}
        >
          {badge.icon_url ? (
            <img
              src={badge.icon_url}
              alt={badge.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{icon}</span>
          )}
        </div>

        {/* Badge Info */}
        <div className="flex-1 space-y-1">
          <h3 className={`font-bold ${colors.text}`}>
            {badge.name}
            {earned && <span className="ml-1 text-green-500">✓</span>}
          </h3>
          <p className="text-xs text-gray-600">{badge.description}</p>

          {/* XP Reward */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-indigo-500">
              +{badge.xp_reward} XP
            </span>
            {earnedAt && (
              <span className="text-xs text-gray-400">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Progress bar (if not earned and progress tracking available) */}
          {!earned && showProgress && progress > 0 && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500">
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
  // Sort: earned first, then by progress
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return b.progress - a.progress;
  });

  const displayBadges = showAll ? sortedBadges : sortedBadges.slice(0, maxDisplay);
  const hiddenCount = badges.length - displayBadges.length;
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-indigo-950">{title}</h2>
          <p className="text-sm text-indigo-500">
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
        <p className="text-center text-sm text-indigo-400">
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
      className={`rounded-[28px] border border-white/70 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-[0_15px_40px_rgba(16,185,129,0.15)] ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🎉</span>
        <h3 className="font-bold text-emerald-700">Recent Badges</h3>
      </div>

      <div className="space-y-3">
        {recentBadges.map((item) => (
          <div
            key={item.badge.id}
            className="flex items-center gap-3 rounded-xl bg-white/80 p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg">
              {item.badge.icon_url ? (
                <img
                  src={item.badge.icon_url}
                  alt={item.badge.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                categoryIcons[item.badge.category || "general"]
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">{item.badge.name}</p>
              <p className="text-xs text-emerald-600">
                {new Date(item.earnedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-500">
              +{item.badge.xp_reward} XP
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
