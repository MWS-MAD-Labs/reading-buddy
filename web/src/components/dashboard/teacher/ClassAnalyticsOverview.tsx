import Link from "next/link";
import type { ClassAnalytics } from "@/app/(dashboard)/dashboard/teacher-analytics-actions";

type ClassAnalyticsOverviewProps = {
  analytics: ClassAnalytics[];
};

export function ClassAnalyticsOverview({ analytics }: ClassAnalyticsOverviewProps) {
  if (analytics.length === 0) {
    return (
      <div className="rounded-[28px] border-2 border-dashed border-indigo-200 bg-white/80 p-8 text-center">
        <span className="text-4xl">📚</span>
        <h3 className="mt-3 text-lg font-bold text-indigo-900">No Classes Yet</h3>
        <p className="mt-1 text-sm text-indigo-500">
          Create your first classroom to see analytics here
        </p>
      </div>
    );
  }

  // Calculate totals across all classes
  const totalStudents = analytics.reduce((sum, a) => sum + a.totalStudents, 0);
  const totalActive = analytics.reduce((sum, a) => sum + a.activeStudents, 0);
  const totalBooks = analytics.reduce((sum, a) => sum + a.totalBooksRead, 0);
  const totalPages = analytics.reduce((sum, a) => sum + a.totalPagesRead, 0);
  const avgEngagement = totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="👥"
          label="Total Students"
          value={totalStudents}
          subtitle={`Across ${analytics.length} ${analytics.length === 1 ? "class" : "classes"}`}
          color="blue"
        />
        <StatCard
          icon="⚡"
          label="Active This Week"
          value={totalActive}
          subtitle={`${avgEngagement}% engagement`}
          color="green"
        />
        <StatCard
          icon="📖"
          label="Books Read"
          value={totalBooks}
          subtitle="By all students"
          color="purple"
        />
        <StatCard
          icon="📄"
          label="Pages Read"
          value={totalPages.toLocaleString()}
          subtitle="Total progress"
          color="amber"
        />
      </div>

      {/* Individual Class Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">
          Class Performance
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {analytics.map((classData) => (
            <ClassCard key={classData.classId} analytics={classData} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Individual stat card component
function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  subtitle: string;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "from-blue-400 to-cyan-400",
    green: "from-green-400 to-emerald-400",
    purple: "from-purple-400 to-fuchsia-400",
    amber: "from-amber-400 to-orange-400",
  };

  return (
    <div className="rounded-[20px] border border-white/70 bg-white/90 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${colorClasses[color]} text-2xl shadow-md`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// Individual class performance card
function ClassCard({ analytics }: { analytics: ClassAnalytics }) {
  const engagementRate = analytics.totalStudents > 0
    ? Math.round((analytics.activeStudents / analytics.totalStudents) * 100)
    : 0;

  // Determine performance level
  const getPerformanceIndicator = () => {
    if (engagementRate >= 80) return { emoji: "🔥", text: "Excellent", color: "text-green-600" };
    if (engagementRate >= 60) return { emoji: "✨", text: "Good", color: "text-blue-600" };
    if (engagementRate >= 40) return { emoji: "📚", text: "Moderate", color: "text-amber-600" };
    return { emoji: "💤", text: "Needs Attention", color: "text-red-600" };
  };

  const performance = getPerformanceIndicator();

  return (
    <Link
      href={`/dashboard/teacher/classrooms/${analytics.classId}`}
      className="group block rounded-[24px] border border-white/70 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 p-6 shadow-[0_15px_50px_rgba(99,102,241,0.1)] transition hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(99,102,241,0.15)]"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-black text-indigo-900 group-hover:text-indigo-600">
            {analytics.className}
          </h4>
          <p className="text-sm text-indigo-500">
            {analytics.totalStudents} {analytics.totalStudents === 1 ? "student" : "students"}
          </p>
        </div>
        <div className={`flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold ${performance.color}`}>
          <span>{performance.emoji}</span>
          <span>{performance.text}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Active" value={`${analytics.activeStudents}/${analytics.totalStudents}`} />
        <MiniStat label="Avg XP" value={analytics.averageXP.toLocaleString()} />
        <MiniStat label="Books" value={analytics.totalBooksRead} />
        <MiniStat label="Avg Level" value={analytics.averageLevel} />
      </div>

      {/* Progress Bar */}
      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-xs font-semibold text-indigo-600">
          <span>Quiz Completion</span>
          <span>{analytics.quizCompletionRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-500"
            style={{ width: `${analytics.quizCompletionRate}%` }}
          />
        </div>
      </div>

      {/* View Details Link */}
      <div className="mt-4 text-sm font-semibold text-indigo-500 group-hover:text-indigo-600">
        View details →
      </div>
    </Link>
  );
}

// Mini stat component for class cards
function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/60 px-3 py-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-base font-bold text-gray-900">{value}</p>
    </div>
  );
}
