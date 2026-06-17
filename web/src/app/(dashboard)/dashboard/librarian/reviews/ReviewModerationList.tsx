"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  FieldHelper,
  Label,
} from "@/components/ui";
import { StarRating } from "@/components/ui/star-rating";
import { moderateReview } from "@/app/(dashboard)/dashboard/library/review-actions";
import type { BookReview } from "@/app/(dashboard)/dashboard/library/review-actions";

type ReviewWithBook = BookReview & { bookTitle: string };

type Props = {
  initialReviews: ReviewWithBook[];
};

export function ReviewModerationList({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<ReviewWithBook[]>(initialReviews);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (reviewId: string) => {
    setProcessing(reviewId);
    setError(null);
    try {
      const result = await moderateReview(reviewId, "approve");
      if (result.success) {
        setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      } else {
        setError(result.error || "Failed to approve review.");
      }
    } catch (err) {
      console.error("Approval failed:", err);
      setError("Failed to approve review.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (reviewId: string) => {
    setShowFeedbackFor(reviewId);
    setFeedback("");
    setError(null);
  };

  const handleRejectSubmit = async (reviewId: string) => {
    if (feedback.trim().length < 10) {
      setError("Feedback must be at least 10 characters.");
      return;
    }

    setProcessing(reviewId);
    setError(null);
    try {
      const result = await moderateReview(reviewId, "reject", feedback);
      if (result.success) {
        setReviews((prev) => prev.filter((review) => review.id !== reviewId));
        setShowFeedbackFor(null);
        setFeedback("");
      } else {
        setError(result.error || "Failed to reject review.");
      }
    } catch (err) {
      console.error("Rejection failed:", err);
      setError("Failed to reject review.");
    } finally {
      setProcessing(null);
    }
  };

  if (reviews.length === 0) {
    return (
      <Card
        variant="frosted"
        padding="spacious"
        className="border-dashed text-center"
      >
        <CardHeader>
          <Badge variant="lime" size="sm" className="mx-auto">
            All caught up
          </Badge>
          <CardTitle>No pending reviews</CardTitle>
          <CardDescription>
            Student reviews that need moderation will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        variant="playful"
        padding="snug"
        className="border border-[#eadfda]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="heading-font font-bold text-[#241718]">
              {reviews.length} review{reviews.length !== 1 ? "s" : ""} pending
              moderation
            </p>
            <p className="text-sm text-[#5d4b4c]">
              Approve high-quality reviews or return clear feedback to students.
            </p>
          </div>
          <Badge variant="amber" size="sm">
            Needs review
          </Badge>
        </div>
      </Card>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="space-y-4">
        {reviews.map((review) => {
          const isProcessing = processing === review.id;
          const isShowingFeedback = showFeedbackFor === review.id;
          const formattedDate = new Date(review.createdAt).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          );

          return (
            <Card
              key={review.id}
              variant="frosted"
              padding="cozy"
              className="border border-[#eadfda]"
            >
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{review.bookTitle}</CardTitle>
                  <CardDescription>
                    by{" "}
                    <span className="font-bold text-[#7E1518]">
                      {review.studentName}
                    </span>{" "}
                    · {formattedDate}
                  </CardDescription>
                </div>
                <StarRating value={review.rating} readonly size="md" />
              </CardHeader>

              <CardContent>
                <div className="rounded-2xl border border-[#eadfda] bg-[#fffaf4] p-4">
                  <p className="text-sm leading-7 text-[#241718]">
                    {review.comment}
                  </p>
                </div>

                {isShowingFeedback ? (
                  <Card
                    variant="playful"
                    padding="snug"
                    className="border border-[#B94A4E]/25"
                  >
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`feedback-${review.id}`}>
                          Feedback for student
                        </Label>
                        <FieldHelper>
                          Explain why this review is being returned and how the
                          student can improve it.
                        </FieldHelper>
                      </div>
                      <textarea
                        id={`feedback-${review.id}`}
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        placeholder="Share clear, specific revision guidance..."
                        rows={3}
                        className="focus-ring w-full rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-sm font-medium text-[#241718] outline-none placeholder:text-[#9b898a] focus:border-[#D6A13A]"
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <FieldHelper>
                          {feedback.length}/10 characters minimum
                        </FieldHelper>
                        {error ? <FieldError>{error}</FieldError> : null}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="neutral"
                          size="sm"
                          onClick={() => {
                            setShowFeedbackFor(null);
                            setFeedback("");
                            setError(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleRejectSubmit(review.id)}
                          disabled={feedback.trim().length < 10}
                          loading={isProcessing}
                        >
                          Confirm rejection
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectClick(review.id)}
                      disabled={isProcessing}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleApprove(review.id)}
                      loading={isProcessing}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
