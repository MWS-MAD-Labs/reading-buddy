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

  let classesQuery = supabaseAdmin.from("classes").select("id, name");
  if (role === "TEACHER") {
    classesQuery = classesQuery.eq("teacher_id", user.id);
  }

  const { data: classroomsData, error: classroomsError } = await classesQuery;

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
