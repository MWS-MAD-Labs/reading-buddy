'use client';

import { useState } from 'react';
import { updateUserData } from '@/app/(dashboard)/dashboard/admin/actions';
import { ACCESS_LEVEL_OPTIONS } from '@/constants/accessLevels';
import { XMarkIcon } from '@heroicons/react/24/outline';

type UserRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'STUDENT' | 'TEACHER' | 'LIBRARIAN' | 'ADMIN';
  access_level: string | null;
};

const ROLES: UserRecord['role'][] = ['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN'];

type EditUserModalProps = {
  user: UserRecord;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export const EditUserModal = ({ user, onClose, onSuccess, onError }: EditUserModalProps) => {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [role, setRole] = useState<UserRecord['role']>(user.role);
  const [accessLevel, setAccessLevel] = useState(user.access_level || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateUserData({
        userId: user.id,
        fullName: fullName.trim() || null,
        role,
        accessLevel: role === 'STUDENT' ? accessLevel || null : null,
      });
      onSuccess(`User "${fullName || user.email}" updated successfully!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update user.';
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border-4 border-violet-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4">
          <h2 className="text-2xl font-black text-violet-900">Edit User</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-violet-500 transition-colors hover:bg-violet-100 hover:text-violet-700"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Email (Read-only) */}
          <div>
            <label className="mb-2 block text-sm font-bold text-violet-900">Email</label>
            <input
              type="text"
              value={user.email || 'No email'}
              disabled
              className="w-full rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-600"
            />
            <p className="mt-1 text-xs font-semibold text-violet-500">Email cannot be changed</p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-bold text-violet-900">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              className="w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-sm font-medium text-violet-900 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-bold text-violet-900">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRecord['role'])}
              className="w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-900 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Access Level (only for students) */}
          {role === 'STUDENT' && (
            <div>
              <label htmlFor="accessLevel" className="mb-2 block text-sm font-bold text-violet-900">
                Access Level
              </label>
              <select
                id="accessLevel"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-900 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Not Set</option>
                {ACCESS_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs font-semibold text-violet-500">
                Staff roles always have access to all content
              </p>
            </div>
          )}

          {role !== 'STUDENT' && (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">
                ℹ️ Staff roles (Teacher, Librarian, Admin) automatically have access to all content.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-full border-2 border-violet-300 bg-white px-6 py-3 text-sm font-bold text-violet-700 transition-all hover:bg-violet-50 active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-full border-2 border-violet-400 bg-violet-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-violet-600 hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
