import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { requireRole } from "@/lib/auth/roleCheck";
import { queryWithContext } from "@/lib/db";
import { ClassroomManager } from "@/components/dashboard/ClassroomManager";
import { ClassAnalyticsOverview } from "@/components/dashboard/teacher/ClassAnalyticsOverview";
import { AssignmentTrackingDashboard } from "@/components/dashboard/teacher/AssignmentTrackingDashboard";
import { StudentPerformanceHeatmap } from "@/components/dashboard/teacher/StudentPerformanceHeatmap";
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  getTeacherClassAnalytics,
  getTeacherBookAssignments,
  getTeacherQuizAssignments,
} from "./teacher-analytics-actions";

export const dynamic = "force-dynamic";

type ClassroomRow = {
  id: number;
  name: string;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
};

export default async function TeacherDashboardPage() {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;
  const profileId = user.profileId!;

  // Get teacher's classrooms
  const classroomsResult = await queryWithContext(
    userId,
    `SELECT id, name FROM classes WHERE teacher_id = $1`,
    [profileId],
  );

  const classrooms = await Promise.all(
    classroomsResult.rows.map(async (c: ClassroomRow) => {
      const countResult = await queryWithContext(
        userId,
        `SELECT COUNT(*) as count FROM class_students WHERE class_id = $1`,
        [c.id],
      );

      return {
        id: c.id,
        name: c.name,
        student_count: parseInt(countResult.rows[0].count || "0"),
      };
    }),
  );

  // Get all teachers
  const allTeachersResult = await queryWithContext(
    userId,
    `SELECT id, full_name FROM profiles WHERE role = 'TEACHER'`,
    [],
  );

  const allTeachers = allTeachersResult.rows.map((t: TeacherRow) => ({
    id: t.id,
    full_name: t.full_name ?? "",
  }));

  // Get class analytics
  const classAnalytics = await getTeacherClassAnalytics(userId, profileId);

  // Get assignment tracking data
  const bookAssignments = await getTeacherBookAssignments(userId, profileId);
  const quizAssignments = await getTeacherQuizAssignments(userId, profileId);

  return (
    <div className="space-y-8">
      <Card variant="glow" padding="cozy">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <CardHeader className="mb-0 max-w-2xl">
            <Badge variant="bubble">Teacher dashboard</Badge>
            <h1 className="heading-font text-3xl font-bold leading-tight text-[#241718] md:text-4xl">
              Welcome back
            </h1>
            <CardDescription>
              Monitor classroom reading momentum, assignments, quizzes, and
              student progress from one focused workspace.
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-2xl border border-[#eadfda] bg-white/75 px-4 py-3 text-center">
              <p className="heading-font text-2xl font-bold text-[#7E1518]">
                {classrooms.length}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6f6061]">
                Classes
              </p>
            </div>
            <div className="rounded-2xl border border-[#eadfda] bg-white/75 px-4 py-3 text-center">
              <p className="heading-font text-2xl font-bold text-[#486142]">
                {classrooms.reduce(
                  (sum, classroom) => sum + classroom.student_count,
                  0,
                )}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6f6061]">
                Students
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="frosted" padding="cozy">
        <CardHeader>
          <Badge variant="sky">Analytics</Badge>
          <CardTitle>Class analytics</CardTitle>
          <CardDescription>
            A quick read on class performance, engagement, and progress.
          </CardDescription>
        </CardHeader>
        <ClassAnalyticsOverview analytics={classAnalytics} />
      </Card>

      <Card variant="frosted" padding="cozy">
        <CardHeader>
          <Badge variant="lime">Assignments</Badge>
          <CardTitle>Assignment tracking</CardTitle>
          <CardDescription>
            Monitor reading and quiz progress across your classes.
          </CardDescription>
        </CardHeader>
        <AssignmentTrackingDashboard
          bookAssignments={bookAssignments}
          quizAssignments={quizAssignments}
        />
      </Card>

      <Card variant="frosted" padding="cozy">
        <CardHeader>
          <Badge variant="amber">Performance</Badge>
          <CardTitle>Performance overview</CardTitle>
          <CardDescription>
            Spot class engagement and activity patterns at a glance.
          </CardDescription>
        </CardHeader>
        <StudentPerformanceHeatmap analytics={classAnalytics} />
      </Card>

      {role === "ADMIN" && (
        <Card variant="playful" padding="snug">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl">
                Looking for all classrooms?
              </CardTitle>
              <CardDescription className="text-sm">
                View detailed stats and manage every classroom in the system.
              </CardDescription>
            </div>
            <Link
              href="/dashboard/teacher/classrooms"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all classrooms
            </Link>
          </div>
        </Card>
      )}

      <Card variant="frosted" padding="cozy">
        <CardHeader>
          <Badge variant="bubble">Teacher lounge</Badge>
          <CardTitle>Classroom management</CardTitle>
          <CardDescription>
            Create classes and manage your students.
          </CardDescription>
        </CardHeader>
        <ClassroomManager
          classrooms={classrooms}
          allTeachers={allTeachers}
          userRole={role as "TEACHER" | "ADMIN"}
        />
      </Card>
    </div>
  );
}
