import type { LibrarianStats } from "@/app/(dashboard)/dashboard/librarian/stats-actions";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

type Tone = "sky" | "sage" | "rose" | "gold";

type StatCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
  tone: Tone;
  trend?: {
    value: number;
    label: string;
  };
  details?: Array<{ label: string; value: number | string }>;
};

const tones: Record<
  Tone,
  { card: string; label: string; value: string; marker: string }
> = {
  sky: {
    card: "border-[#B8DDF8]/60 bg-[#EFF8FE]/80",
    label: "text-[#25638e]",
    value: "text-[#1F2A44]",
    marker: "bg-[#B8DDF8]",
  },
  sage: {
    card: "border-[#6F8B6A]/25 bg-[#EDF3EB]/80",
    label: "text-[#486142]",
    value: "text-[#6F8B6A]",
    marker: "bg-[#6F8B6A]",
  },
  rose: {
    card: "border-[#B94A4E]/25 bg-[#F8EAEB]/80",
    label: "text-[#B94A4E]",
    value: "text-[#B94A4E]",
    marker: "bg-[#B94A4E]",
  },
  gold: {
    card: "border-[#D6A13A]/35 bg-[#FBF2DF]/80",
    label: "text-[#7a5311]",
    value: "text-[#D6A13A]",
    marker: "bg-[#D6A13A]",
  },
};

function StatCard({
  title,
  value,
  subtitle,
  tone,
  trend,
  details,
}: StatCardProps) {
  const style = tones[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-6 card-shadow",
        style.card,
      )}
    >
      <div
        className={cn(
          "absolute right-5 top-5 h-10 w-1 rounded-full",
          style.marker,
        )}
      />
      <div className="space-y-3 pr-6">
        <p
          className={cn(
            "heading-font text-xs font-bold uppercase tracking-[0.18em]",
            style.label,
          )}
        >
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3
            className={cn("heading-font text-4xl font-extrabold", style.value)}
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

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="heading-font text-xl font-bold text-[#7E1518]">
          {title}
        </h2>
        <p className="text-sm leading-6 text-[#5d4b4c]">{description}</p>
      </div>
      <Badge variant="bubble" size="sm">
        Live data
      </Badge>
    </div>
  );
}

function BookRankCard({
  title,
  description,
  books,
  metricLabel,
  tone,
}: {
  title: string;
  description: string;
  books: Array<{
    id: string;
    title: string;
    author: string;
    readCount?: number;
    quizCount?: number;
  }>;
  metricLabel: "readers" | "quizzes";
  tone: "sage" | "gold";
}) {
  const style = tone === "sage" ? tones.sage : tones.gold;

  return (
    <div className="rounded-[28px] border border-[#eadfda] bg-white/90 p-6 card-shadow">
      <div className="mb-4">
        <h3 className="heading-font text-lg font-bold text-[#7E1518]">
          {title}
        </h3>
        <p className="text-sm leading-6 text-[#5d4b4c]">{description}</p>
      </div>

      <div className="space-y-2">
        {books.slice(0, 5).map((book, index) => (
          <div
            key={book.id}
            className="flex items-center gap-3 rounded-2xl border border-[#eadfda] bg-white p-3"
          >
            <div
              className={cn(
                "heading-font flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold",
                style.card,
                style.label,
              )}
            >
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="heading-font truncate font-bold text-[#241718]">
                {book.title.length > 30
                  ? `${book.title.slice(0, 30)}...`
                  : book.title}
              </p>
              <p className="truncate text-xs text-[#6f6061]">
                {book.author} •{" "}
                {metricLabel === "readers" ? book.readCount : book.quizCount}{" "}
                {metricLabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
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
        subtitle={`Most common: ${bookLibrary.mostCommonFormat}`}
        tone="sky"
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
        subtitle="Read in last 7 days"
        tone="sage"
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
      subtitle="Last 30 days"
      tone="rose"
      details={[
        { label: "Total Uploads", value: uploadStatistics.uploadsLast30Days },
        { label: "Est. Storage", value: `${uploadStatistics.totalStorage}MB` },
      ]}
    />,
    <StatCard
      key="popular"
      title="Most Popular"
      value={popularBooks.mostRead[0]?.readCount || 0}
      subtitle={
        popularBooks.mostRead[0]?.title
          ? `${popularBooks.mostRead[0].title.slice(0, 25)}...`
          : "N/A"
      }
      tone="gold"
      details={[
        { label: "Most Read", value: popularBooks.mostRead.length },
        { label: "Most Quizzed", value: popularBooks.mostQuizzed.length },
      ]}
    />,
  ].filter(Boolean);

  const gridCols =
    cards.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2";

  return (
    <div className="space-y-6">
      <SectionHeader
        title={
          variant === "compact" ? "Library Ops Overview" : "Librarian Overview"
        }
        description="Collection insights and usage metrics"
      />

      <div className={cn("grid gap-4", gridCols)}>{cards}</div>

      {uploadStatistics.recentUploads.length > 0 && (
        <div className="rounded-[28px] border border-[#eadfda] bg-white/90 p-6 card-shadow">
          <div className="mb-4">
            <h3 className="heading-font text-lg font-bold text-[#7E1518]">
              Recent Uploads
            </h3>
            <p className="text-sm leading-6 text-[#5d4b4c]">
              Last {uploadStatistics.recentUploads.length} uploads
            </p>
          </div>

          <div className="space-y-2">
            {uploadStatistics.recentUploads.slice(0, 5).map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between rounded-2xl border border-[#eadfda] bg-white p-3"
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
                    <p className="heading-font font-bold text-[#241718]">
                      {upload.title.length > 40
                        ? `${upload.title.slice(0, 40)}...`
                        : upload.title}
                    </p>
                    <p className="text-xs text-[#6f6061]">
                      {new Date(upload.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={upload.status === "success" ? "lime" : "outline"}
                  size="sm"
                >
                  {upload.status === "success" ? "Ready" : "Needs review"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {(popularBooks.mostRead.length > 0 ||
        popularBooks.mostQuizzed.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {popularBooks.mostRead.length > 0 && (
            <BookRankCard
              title="Most Read Books"
              description={`Top ${popularBooks.mostRead.length} by engagement`}
              books={popularBooks.mostRead}
              metricLabel="readers"
              tone="sage"
            />
          )}

          {popularBooks.mostQuizzed.length > 0 && (
            <BookRankCard
              title="Most Quizzed Books"
              description={`Top ${popularBooks.mostQuizzed.length} by quiz generation`}
              books={popularBooks.mostQuizzed}
              metricLabel="quizzes"
              tone="gold"
            />
          )}
        </div>
      )}
    </div>
  );
}
