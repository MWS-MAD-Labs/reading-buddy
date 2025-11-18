import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/roleCheck";
import { ClassroomManager } from "@/components/dashboard/ClassroomManager";

export const dynamic = "force-dynamic";

const cardClass =
  "space-y-4 rounded-[28px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_20px_60px_rgba(147,118,255,0.18)] backdrop-blur-xl";

export default async function TeacherDashboardPage() {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdminClient();

  // Always filter to current user's classes on the dashboard
  // (even admins only see their own classes here)
  const { data: classroomsData, error: classroomsError } = await supabaseAdmin
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user.id);

  if (classroomsError) {
    console.error(classroomsError);
  }

  const classrooms = classroomsData
    ? await Promise.all(
        classroomsData.map(async (c) => {
          const { count } = await supabaseAdmin
            .from("class_students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", c.id);

          return {
            id: c.id,
            name: c.name,
            student_count: count ?? 0,
          };
        }),
      )
    : [];

  const { data: allTeachersData, error: allTeachersError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "TEACHER");

  if (allTeachersError) {
    console.error(allTeachersError);
    // Handle error appropriately
  }

  const allTeachers =
    allTeachersData?.map((t) => ({
      id: t.id,
      full_name: t.full_name ?? "",
    })) ?? [];

  return (
    <div className="space-y-8">
      {role === "ADMIN" && (
        <div className="rounded-[28px] border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-purple-900">
                💡 Looking for all classrooms?
              </p>
              <p className="text-xs text-purple-600">
                View detailed stats and manage all classrooms in the system
              </p>
            </div>
            <Link
              href="/dashboard/teacher/classrooms"
              className="rounded-full bg-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-600"
            >
              View All Classrooms →
            </Link>
          </div>
        </div>
      )}

      <section className={cardClass}>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
            Teacher Lounge
          </p>
          <h2 className="text-2xl font-black text-indigo-950">
            Classroom Management
          </h2>
          <p className="text-sm text-indigo-500">
            Create classes and manage your students.
          </p>
        </div>
        <ClassroomManager
          classrooms={classrooms}
          allTeachers={allTeachers}
          userRole={role as "TEACHER" | "ADMIN"}
        />
      </section>
    </div>
  );
}
