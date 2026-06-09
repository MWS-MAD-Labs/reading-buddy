"use client";

import { useState } from "react";
import { addUser } from "@/app/(dashboard)/dashboard/admin/actions";
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

type UserRole = "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";

const ROLES: UserRole[] = ["STUDENT", "TEACHER", "LIBRARIAN", "ADMIN"];

type AddUserModalProps = {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export const AddUserModal = ({
  onClose,
  onSuccess,
  onError,
}: AddUserModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [accessLevel, setAccessLevel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      onError("Email and password are required.");
      return;
    }

    if (password.length < 6) {
      onError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      await addUser({
        email: email.trim(),
        password,
        fullName: fullName.trim() || null,
        role,
        accessLevel: role === "STUDENT" ? accessLevel || null : null,
      });
      onSuccess(`User "${fullName || email}" created successfully!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to create user.";
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
            Add New User
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
          {/* Email */}
          <div>
            <Label htmlFor="email">
              Email <span className="text-[#B94A4E]">*</span>
            </Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">
              Password <span className="text-[#B94A4E]">*</span>
            </Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
            />
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
            <Label htmlFor="role">
              Role <span className="text-[#B94A4E]">*</span>
            </Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
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
                Determines which books this student can access
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
            <Button
              type="submit"
              loading={isSubmitting}
              variant="secondary"
              className="flex-1"
            >
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
