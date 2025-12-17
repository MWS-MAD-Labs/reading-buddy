import type { LibrarianStats } from "@/app/(dashboard)/dashboard/librarian/stats-actions";
import { Card, CardContent, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import Image from "next/image";

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
  },
  blue: {
    gradient: "from-blue-500 to-cyan-500",
    bg: "from-blue-50 to-cyan-50",
    border: "border-blue-200",
    text: "text-blue-900",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-500",
    bg: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
  },
  amber: {
    gradient: "from-amber-500 to-orange-500",
    bg: "from-amber-50 to-orange-50",
    border: "border-amber-200",
    text: "text-amber-900",
  },
  rose: {
    gradient: "from-rose-500 to-pink-500",
    bg: "from-rose-50 to-pink-50",
    border: "border-rose-200",
    text: "text-rose-900",
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
      <div
        className={cn(
          "absolute inset-0 -z-10 bg-gradient-to-br opacity-30",
          styles.bg,
        )}
      />

      <CardContent className="space-y-3">
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
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
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

type LibrarianStatsCardsProps = {
  stats: LibrarianStats;
  variant?: "full" | "compact";
};

export function LibrarianStatsCards({
  stats,
  variant = "full",
}: LibrarianStatsCardsProps) {
  const { bookLibrary, activeReaders, uploadStatistics, popularBooks } = stats;
  const showCoreLibraryCards = variant !== "compact";

  const cards = [
    showCoreLibraryCards && (
      <StatCard
        key="library"
        title="Book Library"
        value={bookLibrary.total}
        icon="📚"
        subtitle={`Most common: ${bookLibrary.mostCommonFormat}`}
        color="blue"
        details={[
          { label: "PDF", value: bookLibrary.byFormat.pdf },
          { label: "EPUB", value: bookLibrary.byFormat.epub },
          { label: "MOBI", value: bookLibrary.byFormat.mobi },
          {
            label: "AZW/AZW3",
            value: bookLibrary.byFormat.azw + bookLibrary.byFormat.azw3,
          },
        ]}
      />
    ),
    showCoreLibraryCards && (
      <StatCard
        key="active"
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
    ),
    <StatCard
      key="upload"
      title="Upload Success"
      value={`${uploadStatistics.successRate}%`}
      icon="✅"
      subtitle="Last 30 days"
      color="purple"
      details={[
        { label: "Total Uploads", value: uploadStatistics.uploadsLast30Days },
        { label: "Est. Storage", value: `${uploadStatistics.totalStorage}MB` },
      ]}
    />,
    <StatCard
      key="popular"
      title="Most Popular"
      value={popularBooks.mostRead[0]?.readCount || 0}
      icon="⭐"
      subtitle={
        popularBooks.mostRead[0]?.title
          ? `${popularBooks.mostRead[0].title.slice(0, 25)}...`
          : "N/A"
      }
      color="amber"
      details={[
        { label: "Most Read", value: popularBooks.mostRead.length },
        { label: "Most Quizzed", value: popularBooks.mostQuizzed.length },
      ]}
    />,
  ].filter(Boolean) as React.ReactElement[];

  const gridCols =
    cards.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2";

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-indigo-900">
            {variant === "compact"
              ? "Library Ops Overview"
              : "Librarian Overview"}
          </h2>
          <p className="text-sm font-semibold text-indigo-600">
            Collection insights and usage metrics
          </p>
        </div>
        <Badge variant="bubble" size="sm">
          Live Data
        </Badge>
      </div>

      {/* Stats grid */}
      <div className={cn("grid gap-4", gridCols)}>{cards}</div>

      {/* Recent Uploads Section */}
      {uploadStatistics.recentUploads.length > 0 && (
        <Card
          variant="glow"
          padding="cozy"
          className="border-4 border-white/70"
        >
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-indigo-900">
                  Recent Uploads
                </h3>
                <p className="text-sm font-semibold text-indigo-600">
                  Last {uploadStatistics.recentUploads.length} uploads
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {uploadStatistics.recentUploads.slice(0, 5).map((upload: any) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-indigo-100 bg-white/80 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        upload.status === "success"
                          ? "lime"
                          : upload.status === "failed"
                            ? "outline"
                            : "amber"
                      }
                      size="sm"
                    >
                      {upload.format}
                    </Badge>
                    <div>
                      <p className="font-bold text-indigo-900">
                        {upload.title.length > 40
                          ? upload.title.slice(0, 40) + "..."
                          : upload.title}
                      </p>
                      <p className="text-xs font-semibold text-indigo-500">
                        {new Date(upload.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={upload.status === "success" ? "lime" : "outline"}
                    size="sm"
                  >
                    {upload.status === "success" ? "✓" : "✗"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Books Section */}
      {(popularBooks.mostRead.length > 0 ||
        popularBooks.mostQuizzed.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Most Read */}
          {popularBooks.mostRead.length > 0 && (
            <Card
              variant="playful"
              padding="cozy"
              className="border-4 border-white/70"
            >
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-indigo-900">
                    📖 Most Read Books
                  </h3>
                  <p className="text-sm font-semibold text-indigo-600">
                    Top {popularBooks.mostRead.length} by engagement
                  </p>
                </div>

                <div className="space-y-2">
                  {popularBooks.mostRead.slice(0, 5).map((book, index) => (
                    <div
                      key={book.id}
                      className="flex items-center gap-3 rounded-2xl border-2 border-indigo-100 bg-white/80 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 text-lg font-black text-white">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-indigo-900">
                          {book.title.length > 30
                            ? book.title.slice(0, 30) + "..."
                            : book.title}
                        </p>
                        <p className="text-xs font-semibold text-indigo-500">
                          {book.author} • {book.readCount} readers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Most Quizzed */}
          {popularBooks.mostQuizzed.length > 0 && (
            <Card
              variant="playful"
              padding="cozy"
              className="border-4 border-white/70"
            >
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-indigo-900">
                    ✏️ Most Quizzed Books
                  </h3>
                  <p className="text-sm font-semibold text-indigo-600">
                    Top {popularBooks.mostQuizzed.length} by quiz generation
                  </p>
                </div>

                <div className="space-y-2">
                  {popularBooks.mostQuizzed.slice(0, 5).map((book, index) => (
                    <div
                      key={book.id}
                      className="flex items-center gap-3 rounded-2xl border-2 border-indigo-100 bg-white/80 p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-400 text-lg font-black text-white">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-indigo-900">
                          {book.title.length > 30
                            ? book.title.slice(0, 30) + "..."
                            : book.title}
                        </p>
                        <p className="text-xs font-semibold text-indigo-500">
                          {book.author} • {book.quizCount} quizzes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
