import Link from "next/link";
import type { ClassAnalytics } from "@/app/(dashboard)/dashboard/teacher/teacher-analytics-actions";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui";

type ClassAnalyticsOverviewProps = {
  analytics: ClassAnalytics[];
};

export function ClassAnalyticsOverview({
  analytics,
}: ClassAnalyticsOverviewProps) {
  if (analytics.length === 0) {
    return (
      <Card
        variant="frosted"
        padding="cozy"
        className="border-dashed text-center shadow-none"
      >
        <CardTitle className="text-lg">No classes yet</CardTitle>
        <CardDescription>
          Create your first classroom to see analytics here.
        </CardDescription>
      </Card>
    );
  }

  // Calculate totals across all classes
  const totalStudents = analytics.reduce((sum, a) => sum + a.totalStudents, 0);
  const totalActive = analytics.reduce((sum, a) => sum + a.activeStudents, 0);
  const totalBooks = analytics.reduce((sum, a) => sum + a.totalBooksRead, 0);
  const totalPages = analytics.reduce((sum, a) => sum + a.totalPagesRead, 0);
  const avgEngagement =
    totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total students"
          value={totalStudents}
          subtitle={`Across ${analytics.length} ${analytics.length === 1 ? "class" : "classes"}`}
          variant="sky"
        />
        <StatCard
          label="Active this week"
          value={totalActive}
          subtitle={`${avgEngagement}% engagement`}
          variant="lime"
        />
        <StatCard
          label="Books read"
          value={totalBooks}
          subtitle="By all students"
          variant="bubble"
        />
        <StatCard
          label="Pages read"
          value={totalPages.toLocaleString()}
          subtitle="Total progress"
          variant="amber"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="heading-font text-sm font-bold uppercase tracking-wide text-[#7E1518]">
            Class performance
          </h3>
          <Badge variant="neutral" size="sm">
            {analytics.length} {analytics.length === 1 ? "class" : "classes"}
          </Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {analytics.map((classData) => (
            <ClassCard key={classData.classId} analytics={classData} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  variant,
}: {
  label: string;
  value: number | string;
  subtitle: string;
  variant: "sky" | "lime" | "bubble" | "amber";
}) {
  return (
    <Card
      padding="snug"
      className="shadow-none transition hover:-translate-y-0.5"
    >
      <div className="space-y-3">
        <Badge variant={variant} size="sm">
          {label}
        </Badge>
        <p className="heading-font text-3xl font-bold text-[#241718]">
          {value}
        </p>
        <p className="text-xs font-medium text-[#6f6061]">{subtitle}</p>
      </div>
    </Card>
  );
}

function ClassCard({ analytics }: { analytics: ClassAnalytics }) {
  const engagementRate =
    analytics.totalStudents > 0
      ? Math.round((analytics.activeStudents / analytics.totalStudents) * 100)
      : 0;

  const getPerformanceIndicator = () => {
    if (engagementRate >= 80)
      return { text: "Excellent", variant: "lime" } as const;
    if (engagementRate >= 60) return { text: "Good", variant: "sky" } as const;
    if (engagementRate >= 40)
      return { text: "Moderate", variant: "amber" } as const;
    return { text: "Needs attention", variant: "bubble" } as const;
  };

  const performance = getPerformanceIndicator();

  return (
    <Link
      href={`/dashboard/teacher/classrooms/${analytics.classId}`}
      className="group block rounded-[24px] border border-[#eadfda] bg-white/90 p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(36,23,24,0.1)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="heading-font truncate text-lg font-bold text-[#241718] group-hover:text-[#7E1518]">
            {analytics.className}
          </h4>
          <p className="text-sm text-[#6f6061]">
            {analytics.totalStudents}{" "}
            {analytics.totalStudents === 1 ? "student" : "students"}
          </p>
        </div>
        <Badge variant={performance.variant} size="sm">
          {performance.text}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          label="Active"
          value={`${analytics.activeStudents}/${analytics.totalStudents}`}
        />
        <MiniStat label="Avg XP" value={analytics.averageXP.toLocaleString()} />
        <MiniStat label="Books" value={analytics.totalBooksRead} />
        <MiniStat label="Avg level" value={analytics.averageLevel} />
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-[#7E1518]">
          <span>Quiz completion</span>
          <span>{analytics.quizCompletionRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F5E7E8]">
          <div
            className="h-full rounded-full bg-[#7E1518] transition-all duration-500"
            style={{ width: `${analytics.quizCompletionRate}%` }}
          />
        </div>
      </div>

      <div className="mt-4 text-sm font-bold text-[#7E1518] group-hover:underline">
        View details →
      </div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#eadfda] bg-[#fffaf4] px-3 py-2">
      <p className="text-xs font-medium text-[#6f6061]">{label}</p>
      <p className="heading-font text-base font-bold text-[#241718]">{value}</p>
    </div>
  );
}
