"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteClassroom } from "@/app/(dashboard)/dashboard/teacher/actions";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type Classroom = {
  id: number;
  name: string;
  teacher_id: string;
  teacher_name: string;
  student_count: number;
  book_count: number;
  created_at: string;
};

type AllClassroomsTableProps = {
  classrooms: Classroom[];
  currentUserId: string;
};

export const AllClassroomsTable = ({
  classrooms,
  currentUserId,
}: AllClassroomsTableProps) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (classroom: Classroom) => {
    if (
      !confirm(
        `Are you sure you want to delete "${classroom.name}"? This will remove all students, books, and quiz assignments. This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(classroom.id);
    try {
      await deleteClassroom(classroom.id);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete classroom.";
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card variant="frosted" padding="cozy" className="space-y-4">
      <CardHeader>
        <Badge variant="sky">All classrooms</Badge>
        <CardTitle>All classrooms overview</CardTitle>
        <CardDescription>
          Complete list of classrooms in the system.
        </CardDescription>
      </CardHeader>

      <div className="overflow-hidden rounded-3xl border border-[#eadfda] bg-white/85">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#eadfda] text-sm text-[#241718]">
            <thead className="bg-[#fffaf4]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                  Class name
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                  Teacher
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                  Students
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                  Books
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                  Created
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eadfda]">
              {classrooms.length > 0 ? (
                classrooms.map((classroom) => {
                  const isMyClass = classroom.teacher_id === currentUserId;
                  return (
                    <tr
                      key={classroom.id}
                      className={isMyClass ? "bg-[#F5E7E8]/45" : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="heading-font font-bold text-[#241718]">
                            {classroom.name}
                          </p>
                          {isMyClass && (
                            <Badge variant="outline" size="sm">
                              Mine
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#5d4b4c]">
                          {classroom.teacher_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="sky" size="sm">
                          {classroom.student_count}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="amber" size="sm">
                          {classroom.book_count}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-[#6f6061]">
                          {formatDate(classroom.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/teacher/classrooms/${classroom.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            Manage
                          </Link>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(classroom)}
                            loading={deletingId === classroom.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[#6f6061]"
                  >
                    No classrooms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {classrooms.length > 0 && (
          <div className="border-t border-[#eadfda] bg-[#fffaf4] px-4 py-3">
            <p className="text-xs font-bold text-[#7E1518]">
              Total: {classrooms.length} classroom
              {classrooms.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
