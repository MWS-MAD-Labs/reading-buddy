"use client";

import { useState } from "react";
import type { JournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { Badge, Button, Card, CardDescription } from "@/components/ui";
import { cn } from "@/lib/cn";
import { JournalEntryCard } from "./JournalEntryCard";

interface JournalTimelineProps {
  entries: JournalEntry[];
}

function groupEntriesByDate(
  entries: JournalEntry[],
): Map<string, JournalEntry[]> {
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
    filter === "all" ? entries : entries.filter((e) => e.entry_type === filter);

  const groupedEntries = groupEntriesByDate(filteredEntries);

  const tabs = [
    { value: "all", label: "All" },
    { value: "note", label: "Notes" },
    { value: "reading_session", label: "Sessions" },
    { value: "quote", label: "Quotes" },
    { value: "achievement", label: "Achievements" },
  ];

  return (
    <div className="max-w-7xl space-y-4">
      <Card
        variant="frosted"
        padding="snug"
        className="flex max-w-6xl flex-wrap gap-2"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant={filter === tab.value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "transition duration-200 hover:-translate-y-0.5",
              filter !== tab.value && "border-[#eadfda] bg-white",
            )}
          >
            {tab.label}
          </Button>
        ))}
      </Card>

      <div className="space-y-6">
        {Array.from(groupedEntries.entries()).map(([date, dayEntries]) => (
          <div key={date} className="relative">
            <div className="sticky top-0 z-10 mb-3 flex max-w-6xl items-center gap-3 rounded-full bg-[#fffaf4]/90 py-2 backdrop-blur-sm">
              <Badge variant="amber" size="sm">
                Date
              </Badge>
              <h3 className="heading-font text-lg font-bold text-[#7E1518]">
                {date}
              </h3>
            </div>

            <div className="ml-5 max-w-6xl space-y-4 border-l-2 border-[#eadfda] pl-8">
              {dayEntries.map((entry) => (
                <JournalEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <Card
          variant="playful"
          padding="cozy"
          className="border-dashed border-[#D6A13A]/60 text-center"
        >
          <CardDescription>No entries match this filter.</CardDescription>
        </Card>
      )}
    </div>
  );
}
