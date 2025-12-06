"use client";

import { useEffect, useState } from "react";
import type { Badge, BadgeTier } from "@/types/database";

interface BadgeUnlockNotificationProps {
  badge: Badge;
  onClose: () => void;
  autoCloseMs?: number;
}

const tierColors: Record<BadgeTier, { bg: string; border: string; glow: string }> = {
  bronze: {
    bg: "from-amber-400 to-orange-500",
    border: "border-amber-300",
    glow: "shadow-amber-400/50",
  },
  silver: {
    bg: "from-gray-300 to-slate-400",
    border: "border-gray-300",
    glow: "shadow-gray-400/50",
  },
  gold: {
    bg: "from-yellow-400 to-amber-500",
    border: "border-yellow-400",
    glow: "shadow-yellow-400/50",
  },
  platinum: {
    bg: "from-cyan-400 to-blue-500",
    border: "border-cyan-400",
    glow: "shadow-cyan-400/50",
  },
  special: {
    bg: "from-purple-400 to-pink-500",
    border: "border-purple-400",
    glow: "shadow-purple-400/50",
  },
};

const categoryIcons: Record<string, string> = {
  reading: "📖",
  quiz: "📝",
  streak: "🔥",
  milestone: "🏆",
  special: "⭐",
  general: "🎯",
};

export function BadgeUnlockNotification({
  badge,
  onClose,
  autoCloseMs = 5000,
}: BadgeUnlockNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const tier = badge.tier || "bronze";
  const colors = tierColors[tier];
  const icon = categoryIcons[badge.category || "general"];

  useEffect(() => {
    // Trigger entrance animation
    const showTimeout = setTimeout(() => setIsVisible(true), 50);

    // Auto-close after delay
    const closeTimeout = setTimeout(() => {
      handleClose();
    }, autoCloseMs);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(closeTimeout);
    };
  }, [autoCloseMs]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isVisible && !isExiting ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative transform transition-all duration-500 ${
          isVisible && !isExiting
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div
          className={`absolute -inset-4 rounded-3xl bg-gradient-to-r ${colors.bg} opacity-30 blur-xl animate-pulse`}
        />

        {/* Card */}
        <div
          className={`relative rounded-3xl border-2 ${colors.border} bg-white p-8 shadow-2xl ${colors.glow} shadow-lg`}
        >
          {/* Confetti particles (decorative) */}
          <div className="pointer-events-none absolute -inset-8 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`absolute h-2 w-2 rounded-full bg-gradient-to-r ${colors.bg} animate-bounce`}
                style={{
                  left: `${10 + (i * 7) % 80}%`,
                  top: `${5 + (i * 11) % 90}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.5 + (i % 3) * 0.2}s`,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative text-center">
            {/* Trophy icon */}
            <div className="mb-4 text-5xl">🎉</div>

            {/* Badge earned text */}
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-gray-500">
              Badge Unlocked!
            </p>

            {/* Badge icon */}
            <div
              className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${colors.bg} text-4xl shadow-lg`}
            >
              {badge.icon_url ? (
                <img
                  src={badge.icon_url}
                  alt={badge.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                icon
              )}
            </div>

            {/* Badge name */}
            <h2 className="mb-2 text-2xl font-black text-gray-900">
              {badge.name}
            </h2>

            {/* Badge description */}
            <p className="mb-4 text-gray-600">{badge.description}</p>

            {/* XP reward */}
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-600">
              <span>+{badge.xp_reward} XP</span>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="mt-6 block w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 py-3 font-bold text-white shadow-lg transition hover:scale-105"
            >
              Awesome!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BadgeNotificationManagerProps {
  badges: Badge[];
  onAllClosed?: () => void;
}

export function BadgeNotificationManager({
  badges,
  onAllClosed,
}: BadgeNotificationManagerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedBadges, setDisplayedBadges] = useState<Badge[]>(badges);

  useEffect(() => {
    setDisplayedBadges(badges);
    setCurrentIndex(0);
  }, [badges]);

  const handleClose = () => {
    if (currentIndex < displayedBadges.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setDisplayedBadges([]);
      onAllClosed?.();
    }
  };

  if (displayedBadges.length === 0 || currentIndex >= displayedBadges.length) {
    return null;
  }

  return (
    <BadgeUnlockNotification
      badge={displayedBadges[currentIndex]}
      onClose={handleClose}
    />
  );
}

// Hook for managing badge notifications
export function useBadgeNotifications() {
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);

  const showBadges = (badges: Badge[]) => {
    if (badges.length > 0) {
      setPendingBadges(badges);
    }
  };

  const clearBadges = () => {
    setPendingBadges([]);
  };

  return {
    pendingBadges,
    showBadges,
    clearBadges,
    BadgeNotifications: pendingBadges.length > 0 ? (
      <BadgeNotificationManager badges={pendingBadges} onAllClosed={clearBadges} />
    ) : null,
  };
}
