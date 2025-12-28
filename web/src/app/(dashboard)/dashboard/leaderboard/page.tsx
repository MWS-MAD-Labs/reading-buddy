import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import {
  StudentLeaderboard,
  StaffLeaderboard,
} from "@/components/dashboard/leaderboard";
import {
  getStudentLeaderboard,
  getStaffLeaderboard,
} from "../leaderboard-actions";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    redirect("/dashboard");
  }
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "STUDENT";
  const isStudent = role === "STUDENT";

  // Fetch full leaderboards (50 entries)
  const studentLeaderboardResult = await getStudentLeaderboard(
    user.id,
    user.id,
    50,
  );
  const staffLeaderboardResult = await getStaffLeaderboard(
    user.id,
    user.id,
    50,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="rounded-[32px] border border-white/60 bg-gradient-to-br from-violet-50 to-purple-50 p-8 text-indigo-950 shadow-[0_30px_90px_rgba(147,118,255,0.25)]">
        <div className="mb-3 inline-block rounded-full border border-purple-200 bg-gradient-to-r from-purple-200 to-pink-200 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700">
          Leaderboard
        </div>
        <h1 className="mt-2 text-4xl font-black">Reading Champions</h1>
        <p className="mt-3 max-w-2xl text-lg text-indigo-500">
          See who&apos;s leading the way in reading excellence. Earn XP by
          reading pages, finishing books, and completing quizzes!
        </p>
      </header>

      {/* Tab-like info */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2">
          <p className="text-sm font-bold text-indigo-900">
            {isStudent ? "📚 Student Rankings" : "🎓 Staff Rankings"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2">
          <p className="text-xs text-gray-600">
            Rankings update in real-time as you read
          </p>
        </div>
      </div>

      {/* Primary Leaderboard (Based on User Role) */}
      {isStudent ? (
        <>
          {studentLeaderboardResult.success &&
            studentLeaderboardResult.data && (
              <StudentLeaderboard
                entries={studentLeaderboardResult.data.entries}
                currentUserEntry={
                  studentLeaderboardResult.data.currentUserEntry
                }
                totalParticipants={
                  studentLeaderboardResult.data.totalParticipants
                }
                showFullList={true}
              />
            )}

          {studentLeaderboardResult.success &&
            studentLeaderboardResult.data &&
            studentLeaderboardResult.data.entries.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-indigo-200 bg-white/80 p-12 text-center">
                <p className="text-lg font-semibold text-indigo-600">
                  🎯 Be the first on the leaderboard!
                </p>
                <p className="mt-2 text-sm text-indigo-500">
                  Start reading to earn XP and claim your spot.
                </p>
              </div>
            )}

          {!studentLeaderboardResult.success && (
            <div className="rounded-2xl border-4 border-rose-200 bg-rose-50 p-6">
              <p className="font-semibold text-rose-800">
                Failed to load leaderboard: {studentLeaderboardResult.error}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {staffLeaderboardResult.success && staffLeaderboardResult.data && (
            <StaffLeaderboard
              entries={staffLeaderboardResult.data.entries}
              currentUserEntry={staffLeaderboardResult.data.currentUserEntry}
              totalParticipants={staffLeaderboardResult.data.totalParticipants}
              showFullList={true}
            />
          )}

          {staffLeaderboardResult.success &&
            staffLeaderboardResult.data &&
            staffLeaderboardResult.data.entries.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-emerald-200 bg-white/80 p-12 text-center">
                <p className="text-lg font-semibold text-emerald-600">
                  👑 Be the first staff member on the leaderboard!
                </p>
                <p className="mt-2 text-sm text-emerald-500">
                  Start reading to set an example and earn XP.
                </p>
              </div>
            )}

          {!staffLeaderboardResult.success && (
            <div className="rounded-2xl border-4 border-rose-200 bg-rose-50 p-6">
              <p className="font-semibold text-rose-800">
                Failed to load leaderboard: {staffLeaderboardResult.error}
              </p>
            </div>
          )}
        </>
      )}

      {/* Secondary Leaderboard (Other Category) */}
      {isStudent ? (
        <>
          {staffLeaderboardResult.success &&
            staffLeaderboardResult.data &&
            staffLeaderboardResult.data.entries.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-emerald-900">
                    🎓 Staff Who Love Reading
                  </h2>
                  <p className="text-sm text-emerald-600">
                    Teachers, librarians, and admins setting an example
                  </p>
                </div>
                <StaffLeaderboard
                  entries={staffLeaderboardResult.data.entries.slice(0, 10)}
                  currentUserEntry={null}
                  totalParticipants={
                    staffLeaderboardResult.data.totalParticipants
                  }
                  showFullList={false}
                />
              </div>
            )}
        </>
      ) : (
        <>
          {studentLeaderboardResult.success &&
            studentLeaderboardResult.data &&
            studentLeaderboardResult.data.entries.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-indigo-900">
                    📚 Student Reading Champions
                  </h2>
                  <p className="text-sm text-indigo-600">
                    Top students leading by example
                  </p>
                </div>
                <StudentLeaderboard
                  entries={studentLeaderboardResult.data.entries.slice(0, 10)}
                  currentUserEntry={null}
                  totalParticipants={
                    studentLeaderboardResult.data.totalParticipants
                  }
                  showFullList={false}
                />
              </div>
            )}
        </>
      )}

      {/* How XP Works Section */}
      <section className="rounded-[28px] border border-white/70 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-[0_20px_50px_rgba(251,146,60,0.15)]">
        <h3 className="text-xl font-black text-orange-900">
          💡 How to Earn XP
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-orange-800">
          <li className="flex items-start gap-3">
            <span className="text-lg">📖</span>
            <div>
              <p className="font-bold">Read Pages</p>
              <p className="text-orange-600">
                Earn XP for every page you complete
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-bold">Finish Books</p>
              <p className="text-orange-600">
                Big XP bonus when you complete a book
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-lg">🔥</span>
            <div>
              <p className="font-bold">Maintain Streaks</p>
              <p className="text-orange-600">
                Read daily to keep your streak alive and earn bonus XP
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-lg">🎯</span>
            <div>
              <p className="font-bold">Complete Quizzes</p>
              <p className="text-orange-600">
                Test your comprehension and earn extra XP
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
