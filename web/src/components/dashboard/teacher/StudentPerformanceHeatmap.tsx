import Link from "next/link";
import type { ClassAnalytics } from "@/app/(dashboard)/dashboard/teacher/teacher-analytics-actions";
import { Badge, Card, CardDescription, CardTitle } from "@/components/ui";

type StudentPerformanceHeatmapProps = {
  analytics: ClassAnalytics[];
};

export function StudentPerformanceHeatmap({
  analytics,
}: StudentPerformanceHeatmapProps) {
  if (analytics.length === 0) {
    return (
      <Card
        variant="frosted"
        padding="cozy"
        className="border-dashed text-center shadow-none"
      >
        <CardTitle className="text-lg">No data yet</CardTitle>
        <CardDescription>
          Create classes and enroll students to see performance data.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="heading-font text-sm font-bold uppercase tracking-wide text-[#7E1518]">
            Class performance overview
          </h3>
          <p className="text-sm text-[#6f6061]">
            Quick view of engagement and activity levels.
          </p>
        </div>
        <PerformanceLegend />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {analytics.map((classData) => (
          <ClassHeatmapCard key={classData.classId} analytics={classData} />
        ))}
      </div>
    </div>
  );
}

function PerformanceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#6f6061]">
      <span>Performance:</span>
      <Badge variant="bubble" size="sm">
        Low
      </Badge>
      <Badge variant="amber" size="sm">
        Medium
      </Badge>
      <Badge variant="lime" size="sm">
        High
      </Badge>
    </div>
  );
}

function ClassHeatmapCard({ analytics }: { analytics: ClassAnalytics }) {
  const engagementScore =
    analytics.totalStudents > 0
      ? (analytics.activeStudents / analytics.totalStudents) * 100
      : 0;

  const xpScore =
    analytics.averageXP > 0
      ? Math.min((analytics.averageXP / 500) * 100, 100)
      : 0;

  const completionScore = analytics.quizCompletionRate;

  const activityScore =
    analytics.totalPagesRead > 0
      ? Math.min(
          (analytics.totalPagesRead / (analytics.totalStudents * 100)) * 100,
          100,
        )
      : 0;

  const metrics = [
    { label: "Engagement", score: engagementScore },
    { label: "XP growth", score: xpScore },
    { label: "Quizzes", score: completionScore },
    { label: "Reading", score: activityScore },
  ];

  const overallScore =
    (engagementScore + xpScore + completionScore + activityScore) / 4;
  const overallVariant =
    overallScore >= 70 ? "lime" : overallScore >= 40 ? "amber" : "bubble";

  return (
    <Link
      href={`/dashboard/teacher/classrooms/${analytics.classId}`}
      className="group block rounded-[24px] border border-[#eadfda] bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(36,23,24,0.1)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="heading-font truncate text-base font-bold text-[#241718] group-hover:text-[#7E1518]">
            {analytics.className}
          </h4>
          <p className="text-xs text-[#6f6061]">
            {analytics.totalStudents}{" "}
            {analytics.totalStudents === 1 ? "student" : "students"} •{" "}
            {analytics.activeStudents} active
          </p>
        </div>
        <Badge variant={overallVariant} size="sm">
          {Math.round(overallScore)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <MetricCell key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-3 text-xs font-bold text-[#7E1518] group-hover:underline">
        View details →
      </div>
    </Link>
  );
}

function MetricCell({ label, score }: { label: string; score: number }) {
  const tone =
    score >= 70
      ? "bg-[#486142]"
      : score >= 40
        ? "bg-[#D6A13A]"
        : "bg-[#7E1518]";
  const badgeVariant = score >= 70 ? "lime" : score >= 40 ? "amber" : "bubble";

  return (
    <div className="rounded-2xl border border-[#eadfda] bg-[#fffaf4] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-bold text-[#6f6061]">{label}</p>
        <Badge variant={badgeVariant} size="sm">
          {Math.round(score)}
        </Badge>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${tone} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
