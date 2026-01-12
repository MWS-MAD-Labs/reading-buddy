import { requireRole } from "@/lib/auth/roleCheck";
import { getCurrentUser } from "@/lib/auth/server";
import { getPendingReviews } from "@/app/(dashboard)/dashboard/library/review-actions";
import { ReviewModerationList } from "./ReviewModerationList";

export const dynamic = "force-dynamic";

export default async function ReviewModerationPage() {
    await requireRole(["ADMIN", "LIBRARIAN"]);
    const user = await getCurrentUser();

    if (!user?.userId) {
        return <div>Not authenticated</div>;
    }

    const { reviews } = await getPendingReviews();

    return (
        <div className="space-y-6">
            <header className="pop-in rounded-3xl border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-lg">
                <div className="mb-2 inline-block rounded-2xl border-4 border-amber-300 bg-amber-400 px-4 py-1">
                    <p className="text-sm font-black uppercase tracking-wide text-amber-900">
                        Moderation
                    </p>
                </div>
                <h1 className="text-3xl font-black text-amber-900">Review Moderation</h1>
                <p className="text-base font-semibold text-amber-700">
                    Approve or reject book reviews submitted by students.
                </p>
            </header>

            <ReviewModerationList initialReviews={reviews} />
        </div>
    );
}
