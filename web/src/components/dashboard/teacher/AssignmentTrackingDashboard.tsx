"use client";

import { useState, type ReactNode } from "react";
import type {
  BookAssignment,
  QuizAssignment,
} from "@/app/(dashboard)/dashboard/teacher/teacher-analytics-actions";
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui";

type AssignmentTrackingDashboardProps = {
  bookAssignments: BookAssignment[];
  quizAssignments: QuizAssignment[];
};

export function AssignmentTrackingDashboard({
  bookAssignments,
  quizAssignments,
}: AssignmentTrackingDashboardProps) {
  const [activeTab, setActiveTab] = useState<"books" | "quizzes">("books");

  if (bookAssignments.length === 0 && quizAssignments.length === 0) {
    return (
      <Card
        variant="frosted"
        padding="cozy"
        className="border-dashed text-center shadow-none"
      >
        <CardTitle className="text-lg">No assignments yet</CardTitle>
        <CardDescription>
          Assign books and quizzes to your classes to see tracking here.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={activeTab === "books"}
          onClick={() => setActiveTab("books")}
          count={bookAssignments.length}
        >
          Book assignments
        </TabButton>
        <TabButton
          active={activeTab === "quizzes"}
          onClick={() => setActiveTab("quizzes")}
          count={quizAssignments.length}
        >
          Quiz assignments
        </TabButton>
      </div>

      {activeTab === "books" ? (
        <BookAssignmentsList assignments={bookAssignments} />
      ) : (
        <QuizAssignmentsList assignments={quizAssignments} />
      )}
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonVariants({
        variant: active ? "primary" : "neutral",
        size: "sm",
      })}
    >
      {children}
      <Badge variant={active ? "neutral" : "outline"} size="sm">
        {count}
      </Badge>
    </button>
  );
}

function BookAssignmentsList({
  assignments,
}: {
  assignments: BookAssignment[];
}) {
  if (assignments.length === 0) {
    return (
      <Card padding="cozy" className="border-dashed text-center shadow-none">
        <CardDescription>No book assignments found.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <BookAssignmentCard key={assignment.bookId} assignment={assignment} />
      ))}
    </div>
  );
}

function BookAssignmentCard({ assignment }: { assignment: BookAssignment }) {
  const completionVariant =
    assignment.completionRate >= 70
      ? "lime"
      : assignment.completionRate >= 40
        ? "amber"
        : "bubble";

  return (
    <Card padding="snug" className="shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row">
        {assignment.bookCoverUrl && (
          <img
            src={assignment.bookCoverUrl}
            alt={assignment.bookTitle}
            className="h-24 w-16 flex-shrink-0 rounded-xl object-cover shadow-[0_12px_26px_rgba(36,23,24,0.14)]"
          />
        )}

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h4 className="heading-font truncate text-lg font-bold text-[#241718]">
                {assignment.bookTitle}
              </h4>
              <p className="text-sm text-[#6f6061]">
                by {assignment.bookAuthor}
              </p>
              <p className="mt-1 text-xs font-medium text-[#8a7778]">
                {assignment.assignedClasses.join(", ")}
              </p>
            </div>
            <Badge variant={completionVariant} size="sm">
              {assignment.completionRate}% complete
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniMetric label="Total" value={assignment.totalStudents} />
            <MiniMetric label="Started" value={assignment.studentsStarted} />
            <MiniMetric
              label="Completed"
              value={assignment.studentsCompleted}
            />
            <MiniMetric
              label="Avg progress"
              value={`${assignment.averageProgress}%`}
            />
          </div>

          <ProgressBar
            label="Completion rate"
            value={assignment.completionRate}
            tone={completionVariant}
          />
        </div>
      </div>
    </Card>
  );
}

function QuizAssignmentsList({
  assignments,
}: {
  assignments: QuizAssignment[];
}) {
  if (assignments.length === 0) {
    return (
      <Card padding="cozy" className="border-dashed text-center shadow-none">
        <CardDescription>No quiz assignments found.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <QuizAssignmentCard key={assignment.quizId} assignment={assignment} />
      ))}
    </div>
  );
}

function QuizAssignmentCard({ assignment }: { assignment: QuizAssignment }) {
  const scoreVariant =
    assignment.averageScore >= 80
      ? "lime"
      : assignment.averageScore >= 60
        ? "amber"
        : "bubble";
  const participationRate =
    assignment.totalStudents > 0
      ? Math.round(
          (assignment.studentsAttempted / assignment.totalStudents) * 100,
        )
      : 0;

  return (
    <Card padding="snug" className="shadow-none">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h4 className="heading-font truncate text-lg font-bold text-[#241718]">
              {assignment.quizTitle}
            </h4>
            <p className="text-sm text-[#6f6061]">{assignment.bookTitle}</p>
            <p className="mt-1 text-xs font-medium text-[#8a7778]">
              {assignment.assignedClasses.join(", ")}
            </p>
          </div>
          <Badge variant={scoreVariant} size="sm">
            {assignment.averageScore}% avg
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniMetric label="Total" value={assignment.totalStudents} />
          <MiniMetric label="Attempted" value={assignment.studentsAttempted} />
          <MiniMetric label="Avg score" value={`${assignment.averageScore}%`} />
          <MiniMetric label="Pass rate" value={`${assignment.passRate}%`} />
        </div>

        <ProgressBar
          label="Participation"
          value={participationRate}
          tone="sky"
        />
      </div>
    </Card>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfda] bg-[#fffaf4] px-3 py-2">
      <p className="text-xs font-medium text-[#6f6061]">{label}</p>
      <p className="heading-font text-base font-bold text-[#241718]">{value}</p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "sky" | "lime" | "amber" | "bubble";
}) {
  const color = {
    sky: "bg-[#25638e]",
    lime: "bg-[#486142]",
    amber: "bg-[#D6A13A]",
    bubble: "bg-[#7E1518]",
  }[tone];

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold text-[#6f6061]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F5E7E8]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
