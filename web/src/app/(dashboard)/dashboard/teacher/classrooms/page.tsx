import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth/roleCheck";
import { ClassroomManager } from "@/components/dashboard/ClassroomManager";
import { AllClassroomsTable } from "@/components/dashboard/AllClassroomsTable";

export const dynamic = "force-dynamic";

type AdminClassroomRow = {
  id: number;
  name: string;
  teacher_id: string;
  teacher_name: string;
  student_count: number;
  book_count: number;
  created_at: string;
};

export default async function ClassroomManagementPage() {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);

  // Get my classrooms (where I'm the teacher)
  // Uses LEFT JOIN to count students in one go
  const myClassroomsResult = await query(
    `SELECT c.id, c.name, COUNT(cs.id) as student_count
     FROM classes c
     LEFT JOIN class_students cs ON c.id = cs.class_id
     WHERE c.teacher_id = $1
     GROUP BY c.id, c.name`,
    [user.id]
  );

  const myClassrooms = myClassroomsResult.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    student_count: parseInt(row.student_count),
  }));

  // Get all classrooms (for admin view)
  let allClassrooms: AdminClassroomRow[] = [];
  if (role === "ADMIN") {
    // Optimized query to get class details + teacher name + counts
    // Using subqueries for counts to avoid Cartesian product issues with multiple joins
    const allClassroomsResult = await query(
      `SELECT
        c.id, c.name, c.teacher_id, c.created_at,
        p.full_name as teacher_name,
        (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) as student_count,
        (SELECT COUNT(*) FROM class_books cb WHERE cb.class_id = c.id) as book_count
       FROM classes c
       LEFT JOIN profiles p ON c.teacher_id = p.id
       ORDER BY c.created_at DESC`
    );

    allClassrooms = allClassroomsResult.rows.map((row: any): AdminClassroomRow => ({
      id: Number(row.id),
      name: row.name,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name || "Unknown",
      student_count: parseInt(row.student_count),
      book_count: parseInt(row.book_count),
      created_at: row.created_at,
    }));
  }

  // Get all teachers for the dropdown
  const allTeachersResult = await query(
    `SELECT id, full_name FROM profiles WHERE role = 'TEACHER' ORDER BY full_name ASC`
  );

  const allTeachers = allTeachersResult.rows.map((t: any) => ({
    id: t.id,
    full_name: t.full_name ?? "",
  }));

  return (
    <div className="space-y-8">
      <header className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_rgba(93,80,255,0.18)]">
        <div className="mb-3 inline-flex items-center gap-3 rounded-full bg-indigo-100/80 px-4 py-2">
          <p className="text-sm font-black uppercase tracking-wide text-indigo-600">
            Classrooms
          </p>
        </div>
        <h1 className="text-3xl font-black text-indigo-950">
          Classroom Management
        </h1>
        <p className="text-base font-semibold text-indigo-500">
          Create classes, then jump in to manage each one.
        </p>
      </header>

      <ClassroomManager
        classrooms={myClassrooms}
        allTeachers={allTeachers}
        userRole={role as "TEACHER" | "ADMIN"}
      />

      {role === "ADMIN" && allClassrooms.length > 0 && (
        <AllClassroomsTable
          classrooms={allClassrooms}
          currentUserId={user.id}
        />
      )}

      {role === "ADMIN" && allClassrooms.length === 0 && (
        <div className="rounded-[32px] border border-white/70 bg-white/95 p-8 text-center shadow-[0_25px_70px_rgba(147,118,255,0.2)]">
          <p className="text-lg font-semibold text-indigo-500">
            No classrooms in the system yet.
          </p>
        </div>
      )}
    </div>
  );
}
