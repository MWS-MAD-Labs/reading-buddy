"use client";

import Link from "next/link";
import type { StudentBadgeWithBadge } from "@/lib/gamification";

type RecentBadgesProps = {
    badges: StudentBadgeWithBadge[];
    totalBadges?: number;
};

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function RecentBadges({ badges, totalBadges }: RecentBadgesProps) {
    return (
        <div className="pop-in flex h-full flex-col rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_50px_rgba(244,63,94,0.1)]">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <span className="text-xl">🏅</span>
                        <h2 className="text-2xl font-black text-indigo-950">Recent Badges</h2>
                    </div>
                    <p className="text-sm font-semibold text-indigo-500">
                        Showcasing your latest achievements
                    </p>
                </div>
                {totalBadges !== undefined && (
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-rose-500">{totalBadges}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                            Total Earned
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-4">
                {badges.length > 0 ? (
                    badges.map((entry) => (
                        <div
                            key={entry.id}
                            className="group relative flex items-center gap-4 rounded-2xl border border-white/70 bg-white/50 p-4 transition-all hover:scale-[1.02] hover:bg-white/80 hover:shadow-md"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 shadow-inner">
                                {entry.badge.icon_url ? (
                                    <img
                                        src={entry.badge.icon_url}
                                        alt={entry.badge.name}
                                        className="h-8 w-8 object-contain transition-transform group-hover:scale-110"
                                    />
                                ) : (
                                    <span className="text-2xl">🏆</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate font-black text-indigo-900 group-hover:text-rose-600">
                                    {entry.badge.name}
                                </h3>
                                <p className="truncate text-xs font-semibold text-indigo-400">
                                    {entry.badge.description}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-tighter text-indigo-300">
                                    {formatDistanceToNow(new Date(entry.earned_at), { addSuffix: true })}
                                </p>
                                <div className="mt-1 flex items-center justify-end gap-1">
                                    <span className="text-[10px] font-black text-rose-500">+{entry.badge.xp_reward}</span>
                                    <span className="text-[10px] font-bold text-indigo-300">XP</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 p-8 text-center">
                        <span className="mb-3 text-4xl opacity-50">✨</span>
                        <p className="text-sm font-bold text-indigo-400">
                            Your first badge is waiting for you!
                        </p>
                        <Link
                            href="/dashboard/library"
                            className="mt-4 text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
                        >
                            Start Reading →
                        </Link>
                    </div>
                )}
            </div>

            <div className="mt-6 text-center">
                <Link
                    href="/dashboard/student"
                    className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 decoration-rose-400/30 underline-offset-4 transition hover:text-indigo-600 hover:underline"
                >
                    View all badges →
                </Link>
            </div>
        </div>
    );
}
