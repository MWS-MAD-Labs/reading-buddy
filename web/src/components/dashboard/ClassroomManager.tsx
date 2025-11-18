"use client";

import Link from "next/link";
import { useState, type FormEvent, useRef } from "react";
import { createClassroom } from "@/app/(dashboard)/dashboard/teacher/actions";

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
};

export const ClassroomManager = ({
  classrooms,
  allTeachers,
  userRole,
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
      <div className="rounded-[32px] border border-orange-100 bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50 p-6 shadow-[0_25px_70px_rgba(255,173,109,0.25)]">
        <h3 className="text-xl font-black text-indigo-900">Create New Class</h3>
        <p className="text-sm font-medium text-rose-500">
          Give your next reading squad a name
          {userRole === "ADMIN" ? " and optionally assign to a teacher" : ""}.
        </p>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              name="className"
              required
              placeholder="e.g., Grade 5 Reading Stars"
              className="flex-grow rounded-2xl border border-orange-200 bg-white/80 px-4 py-3 text-indigo-950 placeholder:text-orange-300 shadow-[0_12px_30px_rgba(255,173,109,0.25)] focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            {userRole === "ADMIN" && (
              <select
                name="teacherId"
                className="flex-grow rounded-2xl border border-orange-200 bg-white/80 px-4 py-3 text-indigo-950 shadow-[0_12px_30px_rgba(255,173,109,0.25)] focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">Me (current user)</option>
                {allTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-3 font-semibold text-white shadow-[0_18px_35px_rgba(244,114,182,0.35)] transition hover:shadow-[0_22px_40px_rgba(244,114,182,0.45)] disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create class"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm font-semibold text-rose-500">{error}</p>
        )}
      </div>

      <div className="rounded-[32px] border border-indigo-100 bg-white/90 p-6 shadow-[0_25px_70px_rgba(93,80,255,0.18)]">
        <h3 className="text-xl font-black text-indigo-900">Your Classes</h3>
        <p className="text-sm font-medium text-indigo-500">
          Tap manage to curate each roster.
        </p>
        <div className="mt-4 space-y-4">
          {classrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white/95 p-4 shadow-[0_18px_40px_rgba(93,80,255,0.15)] md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-bold text-indigo-900">
                  {classroom.name}
                </p>
                <p className="text-sm font-medium text-indigo-500">
                  {classroom.student_count} students
                </p>
              </div>
              <Link
                href={`/dashboard/teacher/classrooms/${classroom.id}`}
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(79,70,229,0.35)] transition hover:bg-indigo-600"
              >
                Manage classroom
              </Link>
            </div>
          ))}
          {classrooms.length === 0 && (
            <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-6 text-center text-indigo-400">
              You haven&rsquo;t created any classes yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
