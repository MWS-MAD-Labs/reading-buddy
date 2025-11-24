"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserRole,
  updateUserAccessLevel,
  deleteUser,
} from "@/app/(dashboard)/dashboard/admin/actions";
import { ACCESS_LEVEL_OPTIONS } from "@/constants/accessLevels";
import {
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { AddUserModal } from "./AddUserModal";
import { EditUserModal } from "./EditUserModal";
import { BulkUploadModal } from "./BulkUploadModal";

type UserRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  access_level: string | null;
};

const ROLES: UserRecord["role"][] = [
  "STUDENT",
  "TEACHER",
  "LIBRARIAN",
  "ADMIN",
];

export const AdminUserTable = ({ users }: { users: UserRecord[] }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      return (
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query) ||
        user.access_level?.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete user "${userName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);
    try {
      await deleteUser(userId);
      setMessage(`User "${userName}" has been deleted.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to delete user.";
      setError(msg);
    }
  };

  const showSuccessMessage = (msg: string) => {
    setMessage(msg);
    setError(null);
    router.refresh(); // Refresh the page data
    setTimeout(() => setMessage(null), 3000);
  };

  const showErrorMessage = (msg: string) => {
    setError(msg);
    setMessage(null);
  };

  const getAccessLevelLabel = (accessLevel: string | null) => {
    if (!accessLevel) return "Not Set";
    const option = ACCESS_LEVEL_OPTIONS.find(
      (opt) => opt.value === accessLevel,
    );
    return option?.label || accessLevel;
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-violet-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, role, or access level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border-2 border-violet-200 bg-white/90 py-2.5 pl-11 pr-4 text-sm font-medium text-violet-900 placeholder-violet-400 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-300 bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-600 hover:shadow-lg active:scale-95"
          >
            <UserPlusIcon className="h-5 w-5" />
            Add User
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-blue-300 bg-blue-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-600 hover:shadow-lg active:scale-95"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Bulk Upload
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-700">{message}</p>
        </div>
      )}
      {error && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="space-y-4 lg:hidden">
        {filteredUsers.length === 0 ? (
          <div className="rounded-3xl border-2 border-white/60 bg-white/85 px-6 py-12 text-center shadow-[0_20px_60px_rgba(147,118,255,0.18)] backdrop-blur-xl">
            <p className="text-sm font-semibold text-violet-500">
              {searchQuery
                ? "No users found matching your search."
                : "No users found."}
            </p>
          </div>
        ) : (
          <>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-3xl border-2 border-white/60 bg-white/85 p-5 shadow-[0_20px_60px_rgba(147,118,255,0.18)] backdrop-blur-xl transition-all hover:shadow-[0_25px_70px_rgba(147,118,255,0.25)]"
              >
                <div className="mb-4">
                  <h3 className="mb-1 text-lg font-black text-violet-900">
                    {user.full_name || "No name"}
                  </h3>
                  <p className="text-sm font-medium text-violet-700">
                    {user.email || "No email"}
                  </p>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-violet-600">
                      Role:
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : user.role === "TEACHER"
                            ? "bg-blue-100 text-blue-800"
                            : user.role === "LIBRARIAN"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-pink-100 text-pink-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  {user.role === "STUDENT" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-violet-600">
                        Access Level:
                      </span>
                      <span className="text-sm font-semibold text-violet-800">
                        {getAccessLevelLabel(user.access_level)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="min-h-[44px] flex-1 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-violet-600 hover:shadow-md active:scale-95"
                  >
                    <PencilIcon className="mx-auto h-5 w-5 lg:hidden" />
                    <span className="hidden lg:inline">Edit</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteUser(user.id, user.full_name || "this user")
                    }
                    className="min-h-[44px] flex-1 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-rose-600 hover:shadow-md active:scale-95"
                  >
                    <TrashIcon className="mx-auto h-5 w-5 lg:hidden" />
                    <span className="hidden lg:inline">Delete</span>
                  </button>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 px-4 py-3">
              <p className="text-xs font-semibold text-violet-600">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
          </>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-3xl border-2 border-white/60 bg-white/85 shadow-[0_20px_60px_rgba(147,118,255,0.18)] backdrop-blur-xl lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-violet-100">
            <thead className="bg-gradient-to-r from-violet-100 to-purple-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-violet-700">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-violet-700">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-violet-700">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-violet-700">
                  Access Level
                </th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-violet-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-violet-500">
                      {searchQuery
                        ? "No users found matching your search."
                        : "No users found."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-violet-50/50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-violet-900">
                        {user.full_name || "No name"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-violet-700">
                        {user.email || "No email"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : user.role === "TEACHER"
                              ? "bg-blue-100 text-blue-800"
                              : user.role === "LIBRARIAN"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-violet-800">
                        {user.role === "STUDENT"
                          ? getAccessLevelLabel(user.access_level)
                          : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="min-h-[44px] min-w-[44px] rounded-full bg-violet-500 p-2 text-white transition-all hover:bg-violet-600 hover:shadow-md active:scale-95"
                          title="Edit user"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteUser(
                              user.id,
                              user.full_name || "this user",
                            )
                          }
                          className="min-h-[44px] min-w-[44px] rounded-full bg-rose-500 p-2 text-white transition-all hover:bg-rose-600 hover:shadow-md active:scale-95"
                          title="Delete user"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results count */}
        <div className="border-t border-violet-100 bg-violet-50/50 px-6 py-3">
          <p className="text-xs font-semibold text-violet-600">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            setShowAddModal(false);
            showSuccessMessage(msg);
          }}
          onError={showErrorMessage}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(msg) => {
            setEditingUser(null);
            showSuccessMessage(msg);
          }}
          onError={showErrorMessage}
        />
      )}

      {showBulkModal && (
        <BulkUploadModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={(msg) => {
            setShowBulkModal(false);
            showSuccessMessage(msg);
          }}
          onError={showErrorMessage}
        />
      )}
    </div>
  );
};
