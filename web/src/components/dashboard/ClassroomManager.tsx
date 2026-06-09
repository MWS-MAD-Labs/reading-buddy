"use client";

import Link from "next/link";
import { useState, type FormEvent, useRef } from "react";
import { createClassroom } from "@/app/(dashboard)/dashboard/teacher/actions";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
  Select,
} from "@/components/ui";

type Classroom = {
  id: number;
  name: string;
  student_count: number;
};

type Teacher = {
  id: string;
  full_name: string;
};

type ClassroomManagerProps = {
  classrooms: Classroom[];
  allTeachers: Teacher[];
  userRole: "TEACHER" | "ADMIN";
  hideClassroomsList?: boolean;
};

export const ClassroomManager = ({
  classrooms,
  allTeachers,
  userRole,
  hideClassroomsList = false,
}: ClassroomManagerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("className") ?? "").trim();
    const teacherId =
      userRole === "ADMIN"
        ? String(formData.get("teacherId") ?? "").trim() || null
        : null;

    if (!name) {
      setError("Class name is required.");
      setIsCreating(false);
      return;
    }

    try {
      await createClassroom({ name, teacherId });
      formRef.current?.reset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create class.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="playful" padding="snug">
        <CardHeader>
          <Badge variant="amber">New class</Badge>
          <CardTitle className="text-xl">Create new class</CardTitle>
          <CardDescription>
            Give your next reading group a name
            {userRole === "ADMIN"
              ? " and optionally assign it to a teacher"
              : ""}
            .
          </CardDescription>
        </CardHeader>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              name="className"
              required
              placeholder="e.g., Grade 5 Reading Stars"
            />
            {userRole === "ADMIN" && (
              <Select name="teacherId">
                <option value="">Me (current user)</option>
                {allTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <Button type="submit" loading={isCreating} className="md:w-fit">
            Create class
          </Button>
        </form>
        {error && <FieldError className="mt-3">{error}</FieldError>}
      </Card>

      {!hideClassroomsList && classrooms.length > 0 && (
        <Card variant="frosted" padding="snug">
          <CardHeader>
            <Badge variant="sky">Your classes</Badge>
            <CardTitle className="text-xl">Manage classrooms</CardTitle>
            <CardDescription>
              Open a classroom to curate its roster, reading list, and quizzes.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3 lg:grid-cols-2">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#eadfda] bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(36,23,24,0.08)] md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="heading-font text-lg font-bold text-[#241718]">
                    {classroom.name}
                  </p>
                  <p className="text-sm font-medium text-[#6f6061]">
                    {classroom.student_count} student
                    {classroom.student_count === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  href={`/dashboard/teacher/classrooms/${classroom.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
