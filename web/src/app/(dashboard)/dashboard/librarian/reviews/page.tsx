import Link from "next/link";
import { requireRole } from "@/lib/auth/roleCheck";
import { getCurrentUser } from "@/lib/auth/server";
import { getPendingReviews } from "@/app/(dashboard)/dashboard/library/review-actions";
import {
  Alert,
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { ReviewModerationList } from "./ReviewModerationList";

export const dynamic = "force-dynamic";

export default async function ReviewModerationPage() {
  await requireRole(["ADMIN", "LIBRARIAN"]);
  const user = await getCurrentUser();

  if (!user?.userId) {
    return <Alert variant="error">Not authenticated.</Alert>;
  }

  const { reviews } = await getPendingReviews();

  return (
    <div className="space-y-6">
      <Card
        variant="glow"
        padding="spacious"
        className="border-4 border-white/70"
      >
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="bubble" size="sm">
              Review moderation
            </Badge>
            <CardTitle className="text-3xl md:text-4xl">
              Student review queue
            </CardTitle>
            <CardDescription>
              Approve thoughtful book reviews or send revision guidance before
              reviews appear in the library.
            </CardDescription>
          </div>
          <Link
            href="/dashboard/librarian"
            className={cn(
              buttonVariants({ variant: "neutral", size: "md" }),
              "no-underline",
            )}
          >
            Back to Librarian
          </Link>
        </CardHeader>
      </Card>

      <ReviewModerationList initialReviews={reviews} />
    </div>
  );
}
