import type { ReactNode } from "react";
import type { SystemStats } from "@/app/(dashboard)/dashboard/admin/actions";
import { Badge } from "@/components/ui";

type StatTone = "burgundy" | "sky" | "sage" | "gold" | "rose";

type StatCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  tone: StatTone;
  details?: Array<{ label: string; value: number | string }>;
};

const toneStyles: Record<
  StatTone,
  { card: string; eyebrow: string; value: string; fill: string }
> = {
  burgundy: {
    card: "border-[#7E1518]/15 bg-[#F5E7E8]/70",
    eyebrow: "text-[#7E1518]",
    value: "text-[#7E1518]",
    fill: "bg-[#7E1518]",
  },
  sky: {
    card: "border-[#B8DDF8]/60 bg-[#EFF8FE]/80",
    eyebrow: "text-[#25638e]",
    value: "text-[#1F2A44]",
    fill: "bg-[#B8DDF8]",
  },
  sage: {
    card: "border-[#6F8B6A]/25 bg-[#EDF3EB]/80",
    eyebrow: "text-[#486142]",
    value: "text-[#6F8B6A]",
    fill: "bg-[#6F8B6A]",
  },
  gold: {
    card: "border-[#D6A13A]/35 bg-[#FBF2DF]/80",
    eyebrow: "text-[#7a5311]",
    value: "text-[#D6A13A]",
    fill: "bg-[#D6A13A]",
  },
  rose: {
    card: "border-[#B94A4E]/25 bg-[#F8EAEB]/80",
    eyebrow: "text-[#B94A4E]",
    value: "text-[#B94A4E]",
    fill: "bg-[#B94A4E]",
  },
};

function StatCard({
  title,
  value,
  subtitle,
  trend,
  tone,
  details,
}: StatCardProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border p-6 card-shadow ${styles.card}`}
    >
      <div
        className={`absolute right-5 top-5 h-10 w-1 rounded-full ${styles.fill}`}
      />
      <div className="space-y-3 pr-6">
        <p
          className={`heading-font text-xs font-bold uppercase tracking-[0.18em] ${styles.eyebrow}`}
        >
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3
            className={`heading-font text-4xl font-extrabold ${styles.value}`}
          >
            {value}
          </h3>
          {trend && (
            <Badge variant={trend.value >= 0 ? "lime" : "outline"} size="sm">
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-sm leading-6 text-[#5d4b4c]">{subtitle}</p>
        )}

        {details && details.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#eadfda] pt-3">
            {details.map((detail, index) => (
              <div key={index} className="space-y-0.5">
                <p className="text-xs text-[#6f6061]">{detail.label}</p>
                <p className="heading-font text-lg font-bold text-[#241718]">
                  {detail.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type SectionHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="heading-font text-xl font-bold text-[#7E1518]">
          {title}
        </h2>
        <p className="text-sm leading-6 text-[#5d4b4c]">{description}</p>
      </div>
      {action}
    </div>
  );
}

type SystemStatsCardsProps = {
  stats: SystemStats;
};

export function SystemStatsCards({ stats }: SystemStatsCardsProps) {
  const { userCounts, bookStats, activeReaders, aiUsage } = stats;

  const formatEntries = Object.entries(bookStats.byFormat);
  const mostPopularFormat =
    formatEntries.length > 0
      ? formatEntries
          .reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0]
          .toUpperCase()
      : "N/A";

  return (
    <div className="space-y-4">
      <SectionHeader
        title="System Overview"
        description="Real-time statistics across the platform"
        action={
          <Badge variant="bubble" size="sm">
            Live data
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={userCounts.total}
          subtitle="Registered accounts"
          tone="burgundy"
          details={[
            { label: "Students", value: userCounts.students },
            { label: "Teachers", value: userCounts.teachers },
            { label: "Librarians", value: userCounts.librarians },
            { label: "Admins", value: userCounts.admins },
          ]}
        />

        <StatCard
          title="Book Library"
          value={bookStats.total}
          subtitle={`Most common: ${mostPopularFormat}`}
          tone="sky"
          details={[
            { label: "PDF", value: bookStats.byFormat.pdf },
            { label: "EPUB", value: bookStats.byFormat.epub },
            { label: "MOBI", value: bookStats.byFormat.mobi },
            {
              label: "AZW/AZW3",
              value: bookStats.byFormat.azw + bookStats.byFormat.azw3,
            },
          ]}
        />

        <StatCard
          title="Active Readers"
          value={activeReaders.count}
          subtitle="Read in last 7 days"
          tone="sage"
          trend={{
            value: activeReaders.percentageChange,
            label: "vs previous week",
          }}
        />

        <StatCard
          title="AI Generated"
          value={aiUsage.quizzesGenerated}
          subtitle={`Provider: ${aiUsage.currentProvider === "cloud" ? "Cloud (Gemini)" : "Local (RAG)"}`}
          tone="gold"
          details={[
            { label: "Quizzes (this month)", value: aiUsage.quizzesGenerated },
            {
              label: "Descriptions (total)",
              value: aiUsage.descriptionsGenerated,
            },
          ]}
        />
      </div>
    </div>
  );
}
