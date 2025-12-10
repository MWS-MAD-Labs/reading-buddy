"use client";

import Link from "next/link";
import type { LeaderboardEntry } from "@/app/(dashboard)/dashboard/leaderboard-actions";

type StaffLeaderboardProps = {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  totalParticipants: number;
  showFullList?: boolean;
};

export function StaffLeaderboard({
  entries,
  currentUserEntry,
  totalParticipants,
  showFullList = false,
}: StaffLeaderboardProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return "👑";
    if (rank === 2) return "⭐";
    if (rank === 3) return "🌟";
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-amber-400 to-yellow-400";
    if (rank === 2) return "from-blue-400 to-cyan-400";
    if (rank === 3) return "from-purple-400 to-pink-400";
    return "from-emerald-400 to-teal-400";
  };

  const displayEntries = showFullList ? entries : entries.slice(0, 5);

  return (
    <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-[0_20px_50px_rgba(16,185,129,0.2)]">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-emerald-900">
            🎓 Staff Leaderboard
          </h3>
          <p className="text-sm text-emerald-600">
            Teachers, librarians & admins who love reading
          </p>
        </div>
        {currentUserEntry && !showFullList && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-white px-4 py-3 shadow-md">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Your Rank
            </p>
            <p className="text-center text-2xl font-black text-emerald-600">
              #{currentUserEntry.rank}
            </p>
            <p className="text-center text-xs text-emerald-500">
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
                    ? "border-emerald-300 bg-gradient-to-r from-emerald-100 to-teal-100 shadow-lg"
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
                      className={`text-lg font-bold ${entry.isCurrentUser ? "text-emerald-900" : "text-teal-900"}`}
                    >
                      {entry.name}
                    </p>
                    {entry.isCurrentUser && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-teal-700">
                    <span className="font-semibold">Level {entry.level}</span>
                    <span>•</span>
                    <span>{entry.booksCompleted} books</span>
                    <span>•</span>
                    <span>{entry.pagesRead.toLocaleString()} pages</span>
                  </div>
                </div>

                {/* XP Display */}
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600">
                    {entry.xp.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    XP
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/60 p-8 text-center">
          <p className="text-sm text-emerald-500">
            No staff members on the leaderboard yet. Start reading to set an
            example!
          </p>
        </div>
      )}

      {/* Show Current User if Not in Top List */}
      {!showFullList &&
        currentUserEntry &&
        currentUserEntry.rank > displayEntries.length && (
          <div className="mt-4 rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
              Your Position
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 text-lg font-black text-white">
                {currentUserEntry.rank}
              </div>
              <div className="flex-1">
                <p className="font-bold text-emerald-900">
                  {currentUserEntry.name}
                </p>
                <p className="text-xs text-emerald-700">
                  Level {currentUserEntry.level} • {currentUserEntry.booksCompleted}{" "}
                  books
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-emerald-600">
                  {currentUserEntry.xp.toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-emerald-400">XP</p>
              </div>
            </div>
          </div>
        )}

      {/* View Full Leaderboard Link */}
      {!showFullList && totalParticipants > displayEntries.length && (
        <div className="mt-5 text-center">
          <Link
            href="/dashboard/leaderboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-105"
          >
            View Full Leaderboard ({totalParticipants} staff members)
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
