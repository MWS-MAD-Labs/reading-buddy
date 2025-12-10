"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlipBookReader } from "@/components/dashboard/FlipBookReader";
import {
  evaluateAchievements,
  recordReadingProgress,
  getPendingCheckpointForPage,
  markBookAsCompleted,
} from "@/app/(dashboard)/dashboard/student/actions";
import type { Badge } from "@/types/database";

type PageImageInfo = {
  baseUrl: string;
  count: number;
};

type BookReaderProps = {
  bookId: number;
  pdfUrl: string;
  initialPage?: number;
  expectedPages?: number | null;
  pageImages?: PageImageInfo | null;
  bookTitle?: string;
};

type CompletionState = {
  isCompleted: boolean;
  showCelebration: boolean;
  newBadges: Badge[];
  xpAwarded: number;
  leveledUp: boolean;
  newLevel?: number;
};

export const BookReader = ({
  bookId,
  pdfUrl,
  initialPage = 1,
  expectedPages,
  pageImages,
  bookTitle,
}: BookReaderProps) => {
  const [flipError, setFlipError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completion, setCompletion] = useState<CompletionState>({
    isCompleted: false,
    showCelebration: false,
    newBadges: [],
    xpAwarded: 0,
    leveledUp: false,
  });
  const achievementsTriggeredRef = useRef(false);
  const router = useRouter();

  // Only show completion when we've actually reached the last page
  // Use pageImages.count if available (more accurate), otherwise fall back to expectedPages
  const totalPages = pageImages?.count ?? expectedPages ?? 0;
  const isOnLastPage = totalPages > 0 ? currentPage >= totalPages : false;

  useEffect(() => {
    achievementsTriggeredRef.current = false;
    setCompletion({
      isCompleted: false,
      showCelebration: false,
      newBadges: [],
      xpAwarded: 0,
      leveledUp: false,
    });
  }, [bookId]);

  const handleFlipProgress = useCallback(
    (pageNumber: number) => {
      setFlipError(null);
      setCurrentPage(pageNumber);

      recordReadingProgress({ bookId, currentPage: pageNumber })
        .then(async () => {
          // Check for required checkpoint quiz at or before this page
          const checkpoint = await getPendingCheckpointForPage({
            bookId,
            currentPage: pageNumber,
          });

          if (checkpoint.checkpointRequired && checkpoint.quizId) {
            router.push(
              `/dashboard/student/quiz/${checkpoint.quizId}?bookId=${bookId}&page=${pageNumber}`,
            );
            return;
          }
        })
        .catch((err) => {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to save reading progress.";
          setFlipError(message);
        });
    },
    [bookId, router],
  );

  const handleFinishReading = async () => {
    if (isFinishing || completion.isCompleted) return;

    setIsFinishing(true);
    setFlipError(null);

    try {
      const result = await markBookAsCompleted({ bookId });

      setCompletion({
        isCompleted: true,
        showCelebration: true,
        newBadges: result.newBadges,
        xpAwarded: result.xpAwarded,
        leveledUp: result.leveledUp,
        newLevel: result.newLevel,
      });

      achievementsTriggeredRef.current = true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete book.";
      setFlipError(message);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleCloseCelebration = () => {
    setCompletion((prev) => ({ ...prev, showCelebration: false }));
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard/student");
  };

  if (!pageImages || pageImages.count === 0) {
    return (
      <div className="rounded-3xl border-4 border-red-300 bg-red-50 p-8">
        <p className="text-center text-lg font-bold text-red-600">
          This book hasn't been rendered yet. Please contact your librarian.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FlipBookReader
        pageImages={pageImages}
        initialPage={initialPage}
        fallbackPdfUrl={pdfUrl}
        onPageChange={handleFlipProgress}
      />

      {flipError && (
        <p className="text-sm font-semibold text-red-500">{flipError}</p>
      )}

      {/* Finish Reading Button - Shows when on last page */}
      {isOnLastPage && !completion.isCompleted && (
        <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center shadow-lg">
          <div className="mb-4">
            <span className="text-4xl">🎉</span>
          </div>
          <h3 className="mb-2 text-xl font-black text-green-800">
            You've reached the last page!
          </h3>
          <p className="mb-4 text-sm text-green-600">
            Ready to mark this book as finished? You'll earn XP and badges!
          </p>
          <button
            onClick={handleFinishReading}
            disabled={isFinishing}
            className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
          >
            {isFinishing ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Finishing...
              </span>
            ) : (
              "Finish Reading"
            )}
          </button>
        </div>
      )}

      {/* Book Completed Banner */}
      {completion.isCompleted && !completion.showCelebration && (
        <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 text-center">
          <span className="text-3xl">✅</span>
          <h3 className="mt-2 text-lg font-bold text-indigo-800">
            Book Completed!
          </h3>
          <button
            onClick={handleBackToDashboard}
            className="mt-4 rounded-full bg-indigo-500 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Celebration Modal */}
      {completion.showCelebration && (
        <CompletionCelebration
          bookTitle={bookTitle}
          xpAwarded={completion.xpAwarded}
          newBadges={completion.newBadges}
          leveledUp={completion.leveledUp}
          newLevel={completion.newLevel}
          onClose={handleCloseCelebration}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
};

// Completion Celebration Component
function CompletionCelebration({
  bookTitle,
  xpAwarded,
  newBadges,
  leveledUp,
  newLevel,
  onClose,
  onBackToDashboard,
}: {
  bookTitle?: string;
  xpAwarded: number;
  newBadges: Badge[];
  leveledUp: boolean;
  newLevel?: number;
  onClose: () => void;
  onBackToDashboard: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl transition-all duration-500 ${
          isVisible ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti Effect */}
        <div className="pointer-events-none absolute -inset-4 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute h-3 w-3 animate-bounce rounded-full"
              style={{
                left: `${5 + ((i * 5) % 90)}%`,
                top: `${(i * 7) % 100}%`,
                backgroundColor: [
                  "#FFD700",
                  "#FF6B6B",
                  "#4ECDC4",
                  "#9B59B6",
                  "#3498DB",
                ][i % 5],
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${0.5 + (i % 3) * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative text-center">
          {/* Trophy */}
          <div className="mb-4 text-6xl">🏆</div>

          {/* Main Message */}
          <h2 className="mb-2 text-2xl font-black text-gray-900">
            Congratulations!
          </h2>
          <p className="mb-6 text-gray-600">
            You finished reading{" "}
            {bookTitle ? (
              <span className="font-semibold text-indigo-600">
                "{bookTitle}"
              </span>
            ) : (
              "this book"
            )}
            !
          </p>

          {/* XP Earned */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-white shadow-lg">
            <span className="text-2xl">⚡</span>
            <span className="text-xl font-bold">+{xpAwarded} XP</span>
          </div>

          {/* Level Up */}
          {leveledUp && newLevel && (
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-3 text-white shadow-lg">
                <span className="text-2xl">🎉</span>
                <span className="text-xl font-bold">
                  Level Up! Level {newLevel}
                </span>
              </div>
            </div>
          )}

          {/* New Badges */}
          {newBadges.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
                Badges Earned
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {newBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-3 shadow"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
                      {badge.icon_url ? (
                        <img
                          src={badge.icon_url}
                          alt={badge.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        "🏅"
                      )}
                    </div>
                    <span className="text-xs font-semibold text-amber-800">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onBackToDashboard}
              className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 py-3 font-bold text-white shadow-lg transition hover:scale-105"
            >
              Back to Dashboard
            </button>
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Keep Reading
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
