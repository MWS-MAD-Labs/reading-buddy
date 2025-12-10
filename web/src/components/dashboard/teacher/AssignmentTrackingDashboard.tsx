"use client";

import { useState } from "react";
import type { BookAssignment, QuizAssignment } from "@/app/(dashboard)/dashboard/teacher-analytics-actions";

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
      <div className="rounded-[28px] border-2 border-dashed border-indigo-200 bg-white/80 p-8 text-center">
        <span className="text-4xl">📚</span>
        <h3 className="mt-3 text-lg font-bold text-indigo-900">No Assignments Yet</h3>
        <p className="mt-1 text-sm text-indigo-500">
          Assign books and quizzes to your classes to see tracking here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton
          active={activeTab === "books"}
          onClick={() => setActiveTab("books")}
          count={bookAssignments.length}
        >
          📖 Book Assignments
        </TabButton>
        <TabButton
          active={activeTab === "quizzes"}
          onClick={() => setActiveTab("quizzes")}
          count={quizAssignments.length}
        >
          🎯 Quiz Assignments
        </TabButton>
      </div>

      {/* Content */}
      {activeTab === "books" ? (
        <BookAssignmentsList assignments={bookAssignments} />
      ) : (
        <QuizAssignmentsList assignments={quizAssignments} />
      )}
    </div>
  );
}

// Tab button component
function TabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
        active
          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
          : "bg-white/60 text-indigo-600 hover:bg-white/80"
      }`}
    >
      {children}
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          active ? "bg-white/20" : "bg-indigo-100"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// Book assignments list
function BookAssignmentsList({ assignments }: { assignments: BookAssignment[] }) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-2xl bg-white/60 p-8 text-center text-indigo-500">
        No book assignments found
      </div>
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

// Individual book assignment card
function BookAssignmentCard({ assignment }: { assignment: BookAssignment }) {
  const completionColor = assignment.completionRate >= 70 ? "text-green-600" : assignment.completionRate >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div className="rounded-[20px] border border-white/70 bg-white/90 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
      <div className="flex gap-4">
        {/* Book Cover */}
        {assignment.bookCoverUrl && (
          <img
            src={assignment.bookCoverUrl}
            alt={assignment.bookTitle}
            className="h-24 w-16 flex-shrink-0 rounded-lg object-cover shadow-md"
          />
        )}

        {/* Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-3">
            <h4 className="text-lg font-bold text-indigo-900">{assignment.bookTitle}</h4>
            <p className="text-sm text-indigo-500">by {assignment.bookAuthor}</p>
            <p className="mt-1 text-xs text-gray-500">
              {assignment.assignedClasses.join(", ")}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniMetric label="Total" value={assignment.totalStudents} />
            <MiniMetric label="Started" value={assignment.studentsStarted} />
            <MiniMetric label="Completed" value={assignment.studentsCompleted} />
            <MiniMetric label="Avg Progress" value={`${assignment.averageProgress}%`} />
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-600">Completion Rate</span>
              <span className={completionColor}>{assignment.completionRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  assignment.completionRate >= 70
                    ? "bg-gradient-to-r from-green-400 to-emerald-400"
                    : assignment.completionRate >= 40
                    ? "bg-gradient-to-r from-amber-400 to-orange-400"
                    : "bg-gradient-to-r from-red-400 to-pink-400"
                }`}
                style={{ width: `${assignment.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quiz assignments list
function QuizAssignmentsList({ assignments }: { assignments: QuizAssignment[] }) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-2xl bg-white/60 p-8 text-center text-indigo-500">
        No quiz assignments found
      </div>
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

// Individual quiz assignment card
function QuizAssignmentCard({ assignment }: { assignment: QuizAssignment }) {
  const scoreColor = assignment.averageScore >= 80 ? "text-green-600" : assignment.averageScore >= 60 ? "text-amber-600" : "text-red-600";
  const participationRate = assignment.totalStudents > 0
    ? Math.round((assignment.studentsAttempted / assignment.totalStudents) * 100)
    : 0;

  return (
    <div className="rounded-[20px] border border-white/70 bg-white/90 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-4">
        {/* Content */}
        <div className="flex-1">
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <div>
                <h4 className="text-lg font-bold text-indigo-900">{assignment.quizTitle}</h4>
                <p className="text-sm text-indigo-500">{assignment.bookTitle}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {assignment.assignedClasses.join(", ")}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniMetric label="Total" value={assignment.totalStudents} />
            <MiniMetric label="Attempted" value={assignment.studentsAttempted} />
            <MiniMetric label="Avg Score" value={`${assignment.averageScore}%`} valueColor={scoreColor} />
            <MiniMetric label="Pass Rate" value={`${assignment.passRate}%`} />
          </div>

          {/* Participation Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-600">Participation</span>
              <span className="text-indigo-600">{participationRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-500"
                style={{ width: `${participationRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini metric component
function MiniMetric({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number | string;
  valueColor?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`text-base font-bold ${valueColor ?? "text-gray-900"}`}>{value}</p>
    </div>
  );
}
