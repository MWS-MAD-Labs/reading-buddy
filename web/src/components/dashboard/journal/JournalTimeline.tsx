"use client";

import { useState } from "react";
import Link from "next/link";
import type { JournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { JournalEntryCard } from "./JournalEntryCard";

interface JournalTimelineProps {
    entries: JournalEntry[];
}

// Group entries by date
function groupEntriesByDate(entries: JournalEntry[]): Map<string, JournalEntry[]> {
    const groups = new Map<string, JournalEntry[]>();

    entries.forEach((entry) => {
        const date = new Date(entry.created_at).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        if (!groups.has(date)) {
            groups.set(date, []);
        }
        groups.get(date)!.push(entry);
    });

    return groups;
}

export function JournalTimeline({ entries }: JournalTimelineProps) {
    const [filter, setFilter] = useState<string>("all");

    const filteredEntries =
        filter === "all"
            ? entries
            : entries.filter((e) => e.entry_type === filter);

    const groupedEntries = groupEntriesByDate(filteredEntries);

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {[
                    { value: "all", label: "All", icon: "📋" },
                    { value: "note", label: "Notes", icon: "📝" },
                    { value: "reading_session", label: "Sessions", icon: "📖" },
                    { value: "quote", label: "Quotes", icon: "💬" },
                    { value: "achievement", label: "Achievements", icon: "🏆" },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${filter === tab.value
                                ? "bg-gradient-to-r from-indigo-500 to-sky-400 text-white shadow-md"
                                : "bg-white/80 text-indigo-700 hover:bg-indigo-50"
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Timeline */}
            <div className="space-y-6">
                {Array.from(groupedEntries.entries()).map(([date, dayEntries]) => (
                    <div key={date} className="relative">
                        {/* Date Header */}
                        <div className="sticky top-0 z-10 mb-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-400 text-lg shadow-md">
                                📅
                            </div>
                            <h3 className="text-lg font-bold text-indigo-950">{date}</h3>
                        </div>

                        {/* Entries for this date */}
                        <div className="ml-5 border-l-2 border-indigo-100 pl-8 space-y-4">
                            {dayEntries.map((entry) => (
                                <JournalEntryCard key={entry.id} entry={entry} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {filteredEntries.length === 0 && (
                <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/60 p-8 text-center">
                    <p className="text-indigo-500">No entries match this filter.</p>
                </div>
            )}
        </div>
    );
}
