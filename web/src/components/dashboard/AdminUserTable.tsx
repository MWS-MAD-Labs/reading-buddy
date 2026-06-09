"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/app/(dashboard)/dashboard/admin/actions";
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
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
} from "@/components/ui";

type UserRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  access_level: string | null;
};

const roleBadgeVariant: Record<
  UserRecord["role"],
  "bubble" | "sky" | "lime" | "amber"
> = {
  ADMIN: "bubble",
  TEACHER: "sky",
  LIBRARIAN: "lime",
  STUDENT: "amber",
};

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
      <Card variant="frosted" padding="snug">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-[#9b898a]" />
            </div>
            <Input
              type="text"
              placeholder="Search by name, email, role, or access level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full pl-11 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              icon={<UserPlusIcon className="h-5 w-5" />}
            >
              Add User
            </Button>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={() => setShowBulkModal(true)}
              icon={<ArrowUpTrayIcon className="h-5 w-5" />}
            >
              Bulk Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Mobile Card View */}
      <div className="space-y-4 lg:hidden">
        {filteredUsers.length === 0 ? (
          <Card variant="frosted" padding="cozy" className="text-center">
            <p className="text-sm font-semibold text-[#5d4b4c]">
              {searchQuery
                ? "No users found matching your search."
                : "No users found."}
            </p>
          </Card>
        ) : (
          <>
            {filteredUsers.map((user) => (
              <Card key={user.id} variant="frosted" padding="snug">
                <div className="mb-4">
                  <h3 className="heading-font mb-1 text-lg font-bold text-[#241718]">
                    {user.full_name || "No name"}
                  </h3>
                  <p className="text-sm font-medium text-[#5d4b4c]">
                    {user.email || "No email"}
                  </p>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#6f6061]">
                      Role:
                    </span>
                    <Badge variant={roleBadgeVariant[user.role]} size="sm">
                      {user.role}
                    </Badge>
                  </div>
                  {user.role === "STUDENT" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#6f6061]">
                        Access Level:
                      </span>
                      <span className="text-sm font-semibold text-[#241718]">
                        {getAccessLevelLabel(user.access_level)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditUser(user)}
                    icon={<PencilIcon className="h-4 w-4" />}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      handleDeleteUser(user.id, user.full_name || "this user")
                    }
                    icon={<TrashIcon className="h-4 w-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
            <Card variant="frosted" padding="snug">
              <p className="text-xs font-semibold text-[#6f6061]">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Desktop Table View */}
      <Card
        variant="frosted"
        padding="snug"
        className="hidden overflow-hidden lg:block"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#eadfda]">
            <thead className="bg-[#fffaf4]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-[#6f6061]">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-[#6f6061]">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-[#6f6061]">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-[#6f6061]">
                  Access Level
                </th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-[#6f6061]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eadfda] bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-[#5d4b4c]">
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
                    className="transition-colors hover:bg-[#fffaf4]"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#241718]">
                        {user.full_name || "No name"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#5d4b4c]">
                        {user.email || "No email"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={roleBadgeVariant[user.role]} size="sm">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[#241718]">
                        {user.role === "STUDENT"
                          ? getAccessLevelLabel(user.access_level)
                          : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="neutral"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
                          icon={<PencilIcon className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleDeleteUser(
                              user.id,
                              user.full_name || "this user",
                            )
                          }
                          title="Delete user"
                          icon={<TrashIcon className="h-4 w-4" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results count */}
        <div className="border-t border-[#eadfda] bg-[#fffaf4] px-6 py-3">
          <p className="text-xs font-semibold text-[#6f6061]">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      </Card>

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
