'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteClassroom } from '@/app/(dashboard)/dashboard/teacher/actions';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

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

export const AllClassroomsTable = ({ classrooms, currentUserId }: AllClassroomsTableProps) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (classroom: Classroom) => {
    if (
      !confirm(
        `Are you sure you want to delete "${classroom.name}"? This will remove all students, books, and quiz assignments. This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(classroom.id);
    try {
      await deleteClassroom(classroom.id);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete classroom.';
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <section className="space-y-4 rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_25px_70px_rgba(147,118,255,0.2)]">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1">
          <span className="text-lg">📊</span>
          <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
            All Classrooms
          </p>
        </div>
        <h2 className="text-2xl font-black text-indigo-950">All Classrooms Overview</h2>
        <p className="text-sm font-medium text-indigo-500">
          Complete list of all classrooms in the system.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[inset_0_10px_40px_rgba(79,70,229,0.08)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-indigo-50 text-sm text-indigo-900">
            <thead className="bg-gradient-to-r from-indigo-50 to-pink-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-indigo-500">
                  Class Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-indigo-500">
                  Teacher
                </th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-indigo-500">
                  Students
                </th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-indigo-500">
                  Books
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-indigo-500">
                  Created
                </th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-indigo-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {classrooms.length > 0 ? (
                classrooms.map((classroom) => {
                  const isMyClass = classroom.teacher_id === currentUserId;
                  return (
                    <tr
                      key={classroom.id}
                      className={`hover:bg-indigo-50/60 ${isMyClass ? 'bg-indigo-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-indigo-900">{classroom.name}</p>
                          {isMyClass && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-600">
                              Mine
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-indigo-700">{classroom.teacher_name}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                          {classroom.student_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                          {classroom.book_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-indigo-500">{formatDate(classroom.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/teacher/classrooms/${classroom.id}`}
                            className="rounded-full bg-indigo-500 p-2 text-white transition-all hover:bg-indigo-600 hover:shadow-md active:scale-95"
                            title="Manage classroom"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(classroom)}
                            disabled={deletingId === classroom.id}
                            className="rounded-full bg-rose-500 p-2 text-white transition-all hover:bg-rose-600 hover:shadow-md active:scale-95 disabled:opacity-50"
                            title="Delete classroom"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-indigo-400">
                    No classrooms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {classrooms.length > 0 && (
          <div className="border-t border-indigo-100 bg-indigo-50/50 px-4 py-3">
            <p className="text-xs font-semibold text-indigo-600">
              Total: {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
