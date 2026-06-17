"use client";

import { useState } from "react";
import { updateUserData } from "@/app/(dashboard)/dashboard/admin/actions";
import { ACCESS_LEVEL_OPTIONS } from "@/constants/accessLevels";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  Alert,
  Button,
  FieldHelper,
  Input,
  Label,
  Select,
} from "@/components/ui";

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

type EditUserModalProps = {
  user: UserRecord;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export const EditUserModal = ({
  user,
  onClose,
  onSuccess,
  onError,
}: EditUserModalProps) => {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [role, setRole] = useState<UserRecord["role"]>(user.role);
  const [accessLevel, setAccessLevel] = useState(user.access_level || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateUserData({
        userId: user.id,
        fullName: fullName.trim() || null,
        role,
        accessLevel: role === "STUDENT" ? accessLevel || null : null,
      });
      onSuccess(`User "${fullName || user.email}" updated successfully!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to update user.";
      onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-[#eadfda] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eadfda] bg-[#fffaf4] px-6 py-4">
          <h2 className="heading-font text-2xl font-bold text-[#241718]">
            Edit User
          </h2>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="min-h-10 px-3"
            aria-label="Close"
            icon={<XMarkIcon className="h-5 w-5" />}
          >
            Close
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Email (Read-only) */}
          <div>
            <Label>Email</Label>
            <Input
              type="text"
              value={user.email || "No email"}
              disabled
              className="bg-[#f7f2ef] text-[#6f6061]"
            />
            <FieldHelper>Email cannot be changed</FieldHelper>
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          {/* Role */}
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRecord["role"])}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>

          {/* Access Level (only for students) */}
          {role === "STUDENT" && (
            <div>
              <Label htmlFor="accessLevel">Access Level</Label>
              <Select
                id="accessLevel"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
              >
                <option value="">Not Set</option>
                {ACCESS_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldHelper>
                Staff roles always have access to all content
              </FieldHelper>
            </div>
          )}

          {role !== "STUDENT" && (
            <Alert variant="info">
              Staff roles (Teacher, Librarian, Admin) automatically have access
              to all content.
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              variant="neutral"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
