"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  addStudentToClass,
  removeStudentFromClass,
} from "@/app/(dashboard)/dashboard/teacher/actions";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
} from "@/components/ui";

type Student = {
  id: string;
  full_name: string;
};

type ClassroomRosterProps = {
  classId: number;
  students: Student[];
  allStudents: Student[];
  onRosterChange?: () => Promise<void> | void;
};

export const ClassroomRoster = ({
  classId,
  students,
  allStudents,
  onRosterChange,
}: ClassroomRosterProps) => {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const triggerRefresh = async () => {
    if (onRosterChange) {
      await onRosterChange();
    } else {
      router.refresh();
    }
  };

  const availableStudents = allStudents.filter(
    (student) =>
      !students.some((classStudent) => classStudent.id === student.id),
  );
  const datalistId = `roster-students-${classId}`;

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsAdding(true);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const studentName = String(formData.get("studentName") ?? "").trim();
    const selectedStudent = availableStudents.find(
      (student) =>
        (student.full_name ?? "").toLowerCase() === studentName.toLowerCase(),
    );
    const studentId = selectedStudent?.id ?? "";

    if (!studentId) {
      setError("Please select a student to add.");
      setIsAdding(false);
      return;
    }

    try {
      await addStudentToClass({ classId, studentId });
      formElement.reset();
      await triggerRefresh();
      setIsFormOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to add student.";
      setError(message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      await removeStudentFromClass({ classId, studentId });
      await triggerRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove student.";
      setError(message);
    }
  };

  useEffect(() => {
    if (availableStudents.length === 0 && isFormOpen) {
      setIsFormOpen(false);
    }
  }, [availableStudents.length, isFormOpen]);

  return (
    <Card variant="frosted" padding="cozy">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="sky">Roster</Badge>
            <CardTitle className="mt-2">Class roster</CardTitle>
            <CardDescription>
              Current students enrolled in this classroom.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant={isFormOpen ? "neutral" : "secondary"}
            size="sm"
            onClick={() =>
              availableStudents.length > 0 && setIsFormOpen((value) => !value)
            }
            disabled={availableStudents.length === 0}
          >
            {isFormOpen ? "Close" : "Add student"}
          </Button>
        </div>
      </CardHeader>

      {isFormOpen && (
        <form
          onSubmit={handleAddStudent}
          className="flex flex-col gap-3 md:flex-row"
        >
          <Input
            name="studentName"
            list={datalistId}
            required
            placeholder={
              availableStudents.length === 0
                ? "No available students"
                : "Start typing a name..."
            }
            disabled={availableStudents.length === 0}
          />
          <datalist id={datalistId}>
            {availableStudents.map((student) => (
              <option key={student.id} value={student.full_name ?? ""} />
            ))}
          </datalist>
          <Button
            type="submit"
            loading={isAdding}
            disabled={availableStudents.length === 0}
            className="md:w-fit"
          >
            Add student
          </Button>
        </form>
      )}

      {error && <FieldError className="mt-3">{error}</FieldError>}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {students.map((student) => (
          <div
            key={student.id}
            className="flex flex-col gap-3 rounded-2xl border border-[#eadfda] bg-white/90 p-4 md:flex-row md:items-center md:justify-between"
          >
            <p className="heading-font font-bold text-[#241718]">
              {student.full_name}
            </p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleRemoveStudent(student.id)}
              className="w-fit"
            >
              Remove
            </Button>
          </div>
        ))}
        {students.length === 0 && (
          <Card
            padding="snug"
            className="border-dashed text-center shadow-none md:col-span-2"
          >
            <CardDescription>This class has no students yet.</CardDescription>
          </Card>
        )}
      </div>
    </Card>
  );
};
