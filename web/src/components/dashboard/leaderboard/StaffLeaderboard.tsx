"use client";

import Link from "next/link";
import type { LeaderboardEntry } from "@/app/(dashboard)/dashboard/leaderboard-actions";

type StaffLeaderboardProps = {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  totalParticipants: number;
  showFullList?: boolean;
};

const rankTone = (rank: number) => {
  if (rank === 1) return "border-[#D6A13A]/45 bg-[#FBF2DF] text-[#7a5311]";
  if (rank === 2) return "border-[#B8DDF8]/60 bg-[#EFF8FE] text-[#25638e]";
  if (rank === 3) return "border-[#B94A4E]/25 bg-[#F8EAEB] text-[#B94A4E]";
  return "border-[#6F8B6A]/25 bg-[#EDF3EB] text-[#486142]";
};

export function StaffLeaderboard({
  entries,
  currentUserEntry,
  totalParticipants,
  showFullList = false,
}: StaffLeaderboardProps) {
  const displayEntries = showFullList ? entries : entries.slice(0, 5);

  return (
    <div className="rounded-[28px] border border-[#6F8B6A]/25 bg-[#EDF3EB]/70 p-6 card-shadow">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="heading-font text-2xl font-bold text-[#486142]">
            Staff Leaderboard
          </h3>
          <p className="text-sm leading-6 text-[#486142]">
            Teachers, librarians, and admins reading alongside students
          </p>
        </div>
        {currentUserEntry && !showFullList && (
          <div className="rounded-2xl border border-[#6F8B6A]/25 bg-white px-4 py-3 card-shadow">
            <p className="heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#486142]">
              Your rank
            </p>
            <p className="heading-font text-center text-2xl font-extrabold text-[#6F8B6A]">
              #{currentUserEntry.rank}
            </p>
            <p className="text-center text-xs text-[#486142]">
              of {totalParticipants}
            </p>
          </div>
        )}
      </div>

      {displayEntries.length > 0 ? (
        <div className="space-y-3">
          {displayEntries.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                entry.isCurrentUser
                  ? "border-[#6F8B6A]/45 bg-white shadow-sm"
                  : "border-white/70 bg-white/75 hover:bg-white"
              }`}
            >
              <div
                className={`heading-font flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border text-lg font-extrabold ${rankTone(entry.rank)}`}
              >
                {entry.rank}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="heading-font truncate text-lg font-bold text-[#241718]">
                    {entry.name}
                  </p>
                  {entry.isCurrentUser && (
                    <span className="heading-font rounded-full bg-[#6F8B6A] px-2 py-0.5 text-xs font-bold text-white">
                      You
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#486142]">
                  <span className="font-semibold">Level {entry.level}</span>
                  <span>•</span>
                  <span>{entry.booksCompleted} books</span>
                  <span>•</span>
                  <span>{entry.pagesRead.toLocaleString()} pages</span>
                </div>
              </div>

              <div className="text-right">
                <p className="heading-font text-2xl font-extrabold text-[#6F8B6A]">
                  {entry.xp.toLocaleString()}
                </p>
                <p className="heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#486142]">
                  XP
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#6F8B6A]/35 bg-white/60 p-8 text-center">
          <p className="text-sm text-[#486142]">
            No staff members on the leaderboard yet. Start reading to set an
            example.
          </p>
        </div>
      )}

      {!showFullList &&
        currentUserEntry &&
        currentUserEntry.rank > displayEntries.length && (
          <div className="mt-4 rounded-2xl border border-[#6F8B6A]/35 bg-white/70 p-4">
            <p className="heading-font mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#486142]">
              Your position
            </p>
            <div className="flex items-center gap-4">
              <div className="heading-font flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[#6F8B6A]/30 bg-[#EDF3EB] text-lg font-extrabold text-[#486142]">
                {currentUserEntry.rank}
              </div>
              <div className="flex-1">
                <p className="heading-font font-bold text-[#241718]">
                  {currentUserEntry.name}
                </p>
                <p className="text-xs text-[#486142]">
                  Level {currentUserEntry.level} •{" "}
                  {currentUserEntry.booksCompleted} books
                </p>
              </div>
              <div className="text-right">
                <p className="heading-font text-xl font-extrabold text-[#6F8B6A]">
                  {currentUserEntry.xp.toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-[#486142]">XP</p>
              </div>
            </div>
          </div>
        )}

      {!showFullList && totalParticipants > displayEntries.length && (
        <div className="mt-5 text-center">
          <Link
            href="/dashboard/leaderboard"
            className="heading-font inline-flex items-center gap-2 rounded-full bg-[#6F8B6A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#5c7858]"
          >
            View full leaderboard ({totalParticipants} staff members)
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
