import type { SystemStats } from "@/app/(dashboard)/dashboard/admin/actions";
import { Card, CardContent, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

type StatCardProps = {
  title: string;
  value: number | string;
  icon: string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  color: "purple" | "blue" | "emerald" | "amber" | "rose";
  details?: Array<{ label: string; value: number | string }>;
};

const colorStyles = {
  purple: {
    gradient: "from-purple-500 to-pink-500",
    bg: "from-purple-50 to-pink-50",
    border: "border-purple-200",
    text: "text-purple-900",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
  blue: {
    gradient: "from-blue-500 to-cyan-500",
    bg: "from-blue-50 to-cyan-50",
    border: "border-blue-200",
    text: "text-blue-900",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-500",
    bg: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  amber: {
    gradient: "from-amber-500 to-orange-500",
    bg: "from-amber-50 to-orange-50",
    border: "border-amber-200",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  rose: {
    gradient: "from-rose-500 to-pink-500",
    bg: "from-rose-50 to-pink-50",
    border: "border-rose-200",
    text: "text-rose-900",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

function StatCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  color,
  details,
}: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <Card
      variant="frosted"
      padding="cozy"
      className={cn(
        "relative overflow-hidden border-4 transition-all hover:scale-[1.02] hover:shadow-2xl",
        styles.border,
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 -z-10 bg-gradient-to-br opacity-30",
          styles.bg,
        )}
      />

      <CardContent className="space-y-3">
        {/* Header with icon */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className={cn("text-4xl font-black", styles.text)}>
                {value}
              </h3>
              {trend && (
                <Badge
                  variant={trend.value >= 0 ? "lime" : "outline"}
                  size="sm"
                  className="gap-1"
                >
                  {trend.value >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(trend.value)}%
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm font-semibold text-indigo-600">
                {subtitle}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg",
              styles.gradient,
            )}
          >
            {icon}
          </div>
        </div>

        {/* Details breakdown */}
        {details && details.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t-2 border-indigo-100 pt-3">
            {details.map((detail, index) => (
              <div key={index} className="space-y-0.5">
                <p className="text-xs font-semibold text-indigo-500">
                  {detail.label}
                </p>
                <p className="text-lg font-black text-indigo-900">
                  {detail.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SystemStatsCardsProps = {
  stats: SystemStats;
};

export function SystemStatsCards({ stats }: SystemStatsCardsProps) {
  const { userCounts, bookStats, activeReaders, aiUsage } = stats;

  // Calculate most popular format
  const formatEntries = Object.entries(bookStats.byFormat);
  const mostPopularFormat =
    formatEntries.length > 0
      ? formatEntries.reduce((max, curr) =>
          curr[1] > max[1] ? curr : max,
        )[0].toUpperCase()
      : "N/A";

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-indigo-900">
            System Overview
          </h2>
          <p className="text-sm font-semibold text-indigo-600">
            Real-time statistics across the platform
          </p>
        </div>
        <Badge variant="bubble" size="sm">
          Live Data
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <StatCard
          title="Total Users"
          value={userCounts.total}
          icon="👥"
          subtitle="Registered accounts"
          color="purple"
          details={[
            { label: "Students", value: userCounts.students },
            { label: "Teachers", value: userCounts.teachers },
            { label: "Librarians", value: userCounts.librarians },
            { label: "Admins", value: userCounts.admins },
          ]}
        />

        {/* Total Books */}
        <StatCard
          title="Book Library"
          value={bookStats.total}
          icon="📚"
          subtitle={`Most common: ${mostPopularFormat}`}
          color="blue"
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

        {/* Active Readers */}
        <StatCard
          title="Active Readers"
          value={activeReaders.count}
          icon="📖"
          subtitle="Read in last 7 days"
          color="emerald"
          trend={{
            value: activeReaders.percentageChange,
            label: "vs previous week",
          }}
        />

        {/* AI Usage */}
        <StatCard
          title="AI Generated"
          value={aiUsage.quizzesGenerated}
          icon="✨"
          subtitle={`Provider: ${aiUsage.currentProvider === "cloud" ? "Cloud (Gemini)" : "Local (RAG)"}`}
          color="amber"
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
