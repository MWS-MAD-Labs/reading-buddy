"use client";

import Link from "next/link";

type LeaderboardEntry = {
  rank: number;
  studentId: string;
  name: string;
  xp: number;
  level: number;
  isCurrentUser: boolean;
};

type LeaderboardPreviewProps = {
  topStudents: LeaderboardEntry[];
  currentUserRank?: number;
  totalStudents?: number;
};

export function LeaderboardPreview({
  topStudents,
  currentUserRank,
  totalStudents,
}: LeaderboardPreviewProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-amber-400 to-yellow-400";
    if (rank === 2) return "from-slate-300 to-gray-400";
    if (rank === 3) return "from-orange-400 to-amber-500";
    return "from-indigo-400 to-purple-400";
  };

  return (
    <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 shadow-[0_20px_50px_rgba(99,102,241,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-indigo-900">
            🏆 Top Readers
          </h3>
          <p className="text-sm text-indigo-500">
            See who&apos;s leading this week
          </p>
        </div>
        {currentUserRank && (
          <div className="rounded-full bg-white px-4 py-2 shadow-md">
            <p className="text-xs font-bold text-indigo-400">Your Rank</p>
            <p className="text-center text-xl font-black text-indigo-600">
              #{currentUserRank}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {topStudents.map((student: any) => (
          <div
            key={student.studentId}
            className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
              student.isCurrentUser
                ? "border-purple-300 bg-gradient-to-r from-purple-100 to-pink-100 shadow-md"
                : "border-white/70 bg-white/80"
            }`}
          >
            {/* Rank Badge */}
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getRankColor(student.rank)} text-lg font-black text-white shadow-md`}
            >
              {student.rank <= 3 ? getRankIcon(student.rank) : student.rank}
            </div>

            {/* Student Info */}
            <div className="flex-1">
              <p
                className={`font-bold ${student.isCurrentUser ? "text-purple-900" : "text-indigo-900"}`}
              >
                {student.name}
                {student.isCurrentUser && (
                  <span className="ml-2 text-xs font-semibold text-purple-600">
                    (You)
                  </span>
                )}
              </p>
              <p className="text-xs text-indigo-500">Level {student.level}</p>
            </div>

            {/* XP Display */}
            <div className="text-right">
              <p className="text-lg font-black text-indigo-600">
                {student.xp.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-indigo-400">XP</p>
            </div>
          </div>
        ))}
      </div>

      {topStudents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/60 p-6 text-center">
          <p className="text-sm text-indigo-400">
            No leaderboard data available yet. Start reading to climb the
            ranks!
          </p>
        </div>
      )}

      {totalStudents && totalStudents > 3 && (
        <div className="mt-4 text-center">
          <Link
            href="/dashboard/student/leaderboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
          >
            View Full Leaderboard
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
