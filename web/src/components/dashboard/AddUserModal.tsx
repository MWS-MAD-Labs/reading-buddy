'use client';

import { useState } from 'react';
import { addUser } from '@/app/(dashboard)/dashboard/admin/actions';
import { ACCESS_LEVEL_OPTIONS } from '@/constants/accessLevels';
import { XMarkIcon } from '@heroicons/react/24/outline';

type UserRole = 'STUDENT' | 'TEACHER' | 'LIBRARIAN' | 'ADMIN';

const ROLES: UserRole[] = ['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN'];

type AddUserModalProps = {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export const AddUserModal = ({ onClose, onSuccess, onError }: AddUserModalProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [accessLevel, setAccessLevel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      onError('Email and password are required.');
      return;
    }

    if (password.length < 6) {
      onError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addUser({
        email: email.trim(),
        password,
        fullName: fullName.trim() || null,
        role,
        accessLevel: role === 'STUDENT' ? accessLevel || null : null,
      });
      onSuccess(`User "${fullName || email}" created successfully!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create user.';
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
          <h2 className="text-2xl font-black text-violet-900">Add New User</h2>
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
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-violet-900">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-sm font-medium text-violet-900 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-violet-900">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
              className="w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-sm font-medium text-violet-900 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
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
              Role <span className="text-rose-500">*</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-900 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              {ROLES.map((r: any) => (
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
                {ACCESS_LEVEL_OPTIONS.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs font-semibold text-violet-500">
                Determines which books this student can access
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
              className="flex-1 rounded-full border-2 border-emerald-400 bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-600 hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
