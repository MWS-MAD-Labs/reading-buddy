import Link from "next/link";
import type { ClassAnalytics } from "@/app/(dashboard)/dashboard/teacher/teacher-analytics-actions";

type StudentPerformanceHeatmapProps = {
  analytics: ClassAnalytics[];
};

export function StudentPerformanceHeatmap({
  analytics,
}: StudentPerformanceHeatmapProps) {
  if (analytics.length === 0) {
    return (
      <div className="rounded-[28px] border-2 border-dashed border-indigo-200 bg-white/80 p-8 text-center">
        <span className="text-4xl">📊</span>
        <h3 className="mt-3 text-lg font-bold text-indigo-900">No Data Yet</h3>
        <p className="mt-1 text-sm text-indigo-500">
          Create classes and enroll students to see performance data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Class Performance Overview
          </p>
          <p className="text-xs text-gray-400">
            Quick view of engagement and activity levels
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

// Performance legend
function PerformanceLegend() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500">Performance:</span>
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 rounded-sm bg-red-400" />
        <span className="text-gray-600">Low</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 rounded-sm bg-amber-400" />
        <span className="text-gray-600">Medium</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 rounded-sm bg-green-400" />
        <span className="text-gray-600">High</span>
      </div>
    </div>
  );
}

// Individual class heatmap card
function ClassHeatmapCard({ analytics }: { analytics: ClassAnalytics }) {
  // Calculate performance metrics (0-100 scale)
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
    { label: "Engagement", score: engagementScore, icon: "👥" },
    { label: "XP Growth", score: xpScore, icon: "⚡" },
    { label: "Quizzes", score: completionScore, icon: "🎯" },
    { label: "Reading", score: activityScore, icon: "📖" },
  ];

  const overallScore =
    (engagementScore + xpScore + completionScore + activityScore) / 4;
  const getOverallColor = () => {
    if (overallScore >= 70)
      return { bg: "from-green-400 to-emerald-400", text: "text-green-700" };
    if (overallScore >= 40)
      return { bg: "from-amber-400 to-orange-400", text: "text-amber-700" };
    return { bg: "from-red-400 to-pink-400", text: "text-red-700" };
  };

  const colors = getOverallColor();

  return (
    <Link
      href={`/dashboard/teacher/classrooms/${analytics.classId}`}
      className="group block rounded-[20px] border border-white/70 bg-white/90 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)] transition hover:scale-[1.02] hover:shadow-[0_15px_50px_rgba(0,0,0,0.1)]"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex-1">
          <h4 className="text-base font-bold text-indigo-900 group-hover:text-indigo-600">
            {analytics.className}
          </h4>
          <p className="text-xs text-gray-500">
            {analytics.totalStudents}{" "}
            {analytics.totalStudents === 1 ? "student" : "students"} •{" "}
            {analytics.activeStudents} active
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${colors.bg} font-bold text-white shadow-md`}
        >
          {Math.round(overallScore)}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <MetricCell key={metric.label} {...metric} />
        ))}
      </div>

      {/* View Details */}
      <div className="mt-3 text-xs font-semibold text-indigo-500 group-hover:text-indigo-600">
        View details →
      </div>
    </Link>
  );
}

// Individual metric cell
function MetricCell({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon: string;
}) {
  const getColor = () => {
    if (score >= 70) return "bg-green-400";
    if (score >= 40) return "bg-amber-400";
    return "bg-red-400";
  };

  const getTextColor = () => {
    if (score >= 70) return "text-green-700";
    if (score >= 40) return "text-amber-700";
    return "text-red-700";
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{icon}</span>
        <span className={`text-xs font-bold ${getTextColor()}`}>
          {Math.round(score)}
        </span>
      </div>
      <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${getColor()} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[10px] font-medium text-gray-500">{label}</p>
    </div>
  );
}
