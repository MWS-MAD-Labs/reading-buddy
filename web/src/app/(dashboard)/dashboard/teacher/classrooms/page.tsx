import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth/roleCheck";
import { ClassroomManager } from "@/components/dashboard/ClassroomManager";
import { AllClassroomsTable } from "@/components/dashboard/AllClassroomsTable";
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type MyClassroomRow = {
  id: number;
  name: string;
  student_count: string;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
};

type AdminClassroomDbRow = {
  id: number | string;
  name: string;
  teacher_id: string;
  teacher_name: string | null;
  student_count: string;
  book_count: string;
  created_at: string;
};

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
    [user.id],
  );

  const myClassrooms = myClassroomsResult.rows.map((row: MyClassroomRow) => ({
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
       ORDER BY c.created_at DESC`,
    );

    allClassrooms = allClassroomsResult.rows.map(
      (row: AdminClassroomDbRow): AdminClassroomRow => ({
        id: Number(row.id),
        name: row.name,
        teacher_id: row.teacher_id,
        teacher_name: row.teacher_name || "Unknown",
        student_count: parseInt(row.student_count),
        book_count: parseInt(row.book_count),
        created_at: row.created_at,
      }),
    );
  }

  // Get all teachers for the dropdown
  const allTeachersResult = await query(
    `SELECT id, full_name FROM profiles WHERE role = 'TEACHER' ORDER BY full_name ASC`,
  );

  const allTeachers = allTeachersResult.rows.map((t: TeacherRow) => ({
    id: t.id,
    full_name: t.full_name ?? "",
  }));

  return (
    <div className="space-y-8">
      <Card variant="glow" padding="cozy">
        <CardHeader className="mb-0">
          <Badge variant="bubble">Classrooms</Badge>
          <h1 className="heading-font text-3xl font-bold leading-tight text-[#241718] md:text-4xl">
            Classroom management
          </h1>
          <CardDescription>
            Create classes, then jump in to manage rosters, reading lists, and
            quizzes.
          </CardDescription>
        </CardHeader>
      </Card>

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
        <Card padding="cozy" className="border-dashed text-center">
          <CardTitle className="text-lg">No classrooms yet</CardTitle>
          <CardDescription>
            No classrooms have been created in the system yet.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}
