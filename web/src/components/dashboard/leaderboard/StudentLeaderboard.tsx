"use client";

import Link from "next/link";
import type { LeaderboardEntry } from "@/app/(dashboard)/dashboard/leaderboard-actions";

type StudentLeaderboardProps = {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  totalParticipants: number;
  showFullList?: boolean;
};

export function StudentLeaderboard({
  entries,
  currentUserEntry,
  totalParticipants,
  showFullList = false,
}: StudentLeaderboardProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-amber-400 to-yellow-400";
    if (rank === 2) return "from-slate-300 to-gray-400";
    if (rank === 3) return "from-orange-400 to-amber-500";
    return "from-indigo-400 to-purple-400";
  };

  const displayEntries = showFullList ? entries : entries.slice(0, 5);

  return (
    <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 shadow-[0_20px_50px_rgba(99,102,241,0.2)]">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-indigo-900">
            🏆 Student Leaderboard
          </h3>
          <p className="text-sm text-indigo-500">
            Top readers competing for glory
          </p>
        </div>
        {currentUserEntry && !showFullList && (
          <div className="rounded-2xl border-2 border-indigo-200 bg-white px-4 py-3 shadow-md">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Your Rank
            </p>
            <p className="text-center text-2xl font-black text-indigo-600">
              #{currentUserEntry.rank}
            </p>
            <p className="text-center text-xs text-indigo-500">
              of {totalParticipants}
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      {displayEntries.length > 0 ? (
        <div className="space-y-3">
          {displayEntries.map((entry) => {
            const rankIcon = getRankIcon(entry.rank);
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                  entry.isCurrentUser
                    ? "border-purple-300 bg-gradient-to-r from-purple-100 to-pink-100 shadow-lg"
                    : "border-white/70 bg-white/80 hover:bg-white"
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getRankColor(entry.rank)} text-2xl font-black text-white shadow-md`}
                >
                  {rankIcon || entry.rank}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-lg font-bold ${entry.isCurrentUser ? "text-purple-900" : "text-indigo-900"}`}
                    >
                      {entry.name}
                    </p>
                    {entry.isCurrentUser && (
                      <span className="rounded-full bg-purple-500 px-2 py-0.5 text-xs font-bold text-white">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-indigo-600">
                    <span className="font-semibold">Level {entry.level}</span>
                    <span>•</span>
                    <span>{entry.booksCompleted} books</span>
                    <span>•</span>
                    <span>{entry.readingStreak}🔥 streak</span>
                  </div>
                </div>

                {/* XP Display */}
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-600">
                    {entry.xp.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    XP
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/60 p-8 text-center">
          <p className="text-sm text-indigo-400">
            No leaderboard data yet. Be the first to start reading and earn XP!
          </p>
        </div>
      )}

      {/* Show Current User if Not in Top List */}
      {!showFullList &&
        currentUserEntry &&
        currentUserEntry.rank > displayEntries.length && (
          <div className="mt-4 rounded-2xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-purple-500">
              Your Position
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 text-lg font-black text-white">
                {currentUserEntry.rank}
              </div>
              <div className="flex-1">
                <p className="font-bold text-purple-900">
                  {currentUserEntry.name}
                </p>
                <p className="text-xs text-purple-600">
                  Level {currentUserEntry.level} • {currentUserEntry.booksCompleted}{" "}
                  books
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-purple-600">
                  {currentUserEntry.xp.toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-purple-400">XP</p>
              </div>
            </div>
          </div>
        )}

      {/* View Full Leaderboard Link */}
      {!showFullList && totalParticipants > displayEntries.length && (
        <div className="mt-5 text-center">
          <Link
            href="/dashboard/leaderboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-105"
          >
            View Full Leaderboard ({totalParticipants} students)
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
