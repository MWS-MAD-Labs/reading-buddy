import { Badge, Card } from "@/components/ui";

interface JournalStatsProps {
  stats: {
    totalEntries: number;
    notesCount: number;
    booksWithNotes: number;
    readingSessions: number;
    quotesCount: number;
  };
}

export function JournalStats({ stats }: JournalStatsProps) {
  const statCards = [
    {
      label: "Total Entries",
      value: stats.totalEntries,
      badge: "Overview",
      badgeVariant: "bubble" as const,
    },
    {
      label: "Notes",
      value: stats.notesCount,
      badge: "Ideas",
      badgeVariant: "amber" as const,
    },
    {
      label: "Books Noted",
      value: stats.booksWithNotes,
      badge: "Books",
      badgeVariant: "sky" as const,
    },
    {
      label: "Reading Sessions",
      value: stats.readingSessions,
      badge: "Progress",
      badgeVariant: "lime" as const,
    },
    {
      label: "Saved Quotes",
      value: stats.quotesCount,
      badge: "Quotes",
      badgeVariant: "neutral" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {statCards.map((stat) => (
        <Card
          key={stat.label}
          variant="frosted"
          padding="snug"
          className="group transition duration-200 hover:-translate-y-0.5 hover:border-[#D6A13A]/50"
        >
          <Badge variant={stat.badgeVariant} size="sm" className="mb-4">
            {stat.badge}
          </Badge>
          <p className="heading-font text-3xl font-extrabold text-[#7E1518] transition group-hover:text-[#681114]">
            {stat.value}
          </p>
          <p className="text-xs font-medium text-[#6f6061]">{stat.label}</p>
        </Card>
      ))}
    </div>
  );
}
