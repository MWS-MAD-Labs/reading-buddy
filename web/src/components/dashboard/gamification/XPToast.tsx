"use client";

import { useEffect, useState } from "react";

interface XPToastProps {
  amount: number;
  message?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export function XPToast({
  amount,
  message,
  onClose,
  autoCloseMs = 3000,
}: XPToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const showTimeout = setTimeout(() => setIsVisible(true), 50);

    // Auto-close after delay
    const closeTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, autoCloseMs);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(closeTimeout);
    };
  }, [autoCloseMs, onClose]);

  return (
    <div
      className={`fixed right-4 top-4 z-50 transform transition-all duration-300 ${
        isVisible
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 text-white shadow-lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl">
          ⚡
        </div>
        <div>
          <p className="text-lg font-bold">+{amount} XP</p>
          {message && <p className="text-sm text-white/80">{message}</p>}
        </div>
      </div>
    </div>
  );
}

interface LevelUpToastProps {
  newLevel: number;
  onClose: () => void;
  autoCloseMs?: number;
}

export function LevelUpToast({
  newLevel,
  onClose,
  autoCloseMs = 4000,
}: LevelUpToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimeout = setTimeout(() => setIsVisible(true), 50);

    const closeTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, autoCloseMs);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(closeTimeout);
    };
  }, [autoCloseMs, onClose]);

  return (
    <div
      className={`fixed inset-x-0 top-4 z-50 flex justify-center transition-all duration-500 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-yellow-400 to-amber-500 opacity-50 blur-lg animate-pulse" />

        <div className="relative flex items-center gap-4 rounded-2xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-4 text-white shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-inner">
            🎉
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-yellow-100">
              Level Up!
            </p>
            <p className="text-2xl font-black">Level {newLevel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StreakToastProps {
  streak: number;
  onClose: () => void;
  autoCloseMs?: number;
}

export function StreakToast({
  streak,
  onClose,
  autoCloseMs = 3000,
}: StreakToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimeout = setTimeout(() => setIsVisible(true), 50);

    const closeTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, autoCloseMs);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(closeTimeout);
    };
  }, [autoCloseMs, onClose]);

  // Milestone messages
  let message = `${streak} day streak!`;
  if (streak === 7) message = "One week streak!";
  else if (streak === 14) message = "Two week streak!";
  else if (streak === 30) message = "One month streak!";
  else if (streak === 60) message = "Two month streak!";
  else if (streak === 100) message = "100 day streak!";

  return (
    <div
      className={`fixed right-4 top-4 z-50 transform transition-all duration-300 ${
        isVisible
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-400 to-red-500 px-5 py-3 text-white shadow-lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl">
          🔥
        </div>
        <div>
          <p className="text-lg font-bold">{message}</p>
          <p className="text-sm text-white/80">Keep reading every day!</p>
        </div>
      </div>
    </div>
  );
}
