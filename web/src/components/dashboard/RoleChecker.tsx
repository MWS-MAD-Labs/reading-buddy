"use client";

import { useEffect, useState } from "react";
import { checkCurrentUserRole } from "@/app/(dashboard)/dashboard/librarian/actions";

type RoleProfile = {
  role?: string | null;
  full_name?: string | null;
};

type RoleInfo = {
  userId?: string;
  email?: string | null;
  profile?: RoleProfile | null;
  profileError?: string | null;
  hasDuplicates?: boolean | null;
  profileCount?: number;
  error?: string;
};

export const RoleChecker = () => {
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkCurrentUserRole().then((info) => {
      setRoleInfo(info);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-400">Checking your role...</p>
      </div>
    );
  }

  if (roleInfo?.error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-4">
        <p className="text-sm text-red-400">Error: {roleInfo.error}</p>
      </div>
    );
  }

  const isAuthorized =
    roleInfo?.profile?.role === "LIBRARIAN" ||
    roleInfo?.profile?.role === "ADMIN";
  const noProfile = roleInfo?.profileCount === 0;

  return (
    <div
      className={`rounded-lg border p-4 ${isAuthorized
        ? "border-green-700 bg-green-900/20"
        : noProfile
          ? "border-red-700 bg-red-900/20"
          : "border-yellow-700 bg-yellow-900/20"
        }`}
    >
      <h3 className="mb-2 text-sm font-semibold text-white">
        Your Account Status
      </h3>
      <div className="space-y-1 text-sm">
        <p className="text-slate-300">
          <span className="font-medium">Email:</span> {roleInfo?.email}
        </p>
        <p className="text-slate-300">
          <span className="font-medium">User ID:</span>{" "}
          {roleInfo?.userId?.substring(0, 8)}...
        </p>
        {roleInfo?.profileError ? (
          <p className="text-red-400">
            <span className="font-medium">Profile Error:</span>{" "}
            {roleInfo.profileError}
          </p>
        ) : (
          <>
            <p className="text-slate-300">
              <span className="font-medium">Current Role:</span>{" "}
              <span
                className={`font-bold ${isAuthorized ? "text-green-400" : "text-yellow-400"
                  }`}
              >
                {roleInfo?.profile?.role || "UNKNOWN"}
              </span>
            </p>
            {roleInfo?.profile?.full_name && (
              <p className="text-slate-300">
                <span className="font-medium">Name:</span>{" "}
                {roleInfo.profile.full_name}
              </p>
            )}
            <p className="text-slate-300">
              <span className="font-medium">Profiles Found:</span>{" "}
              <span
                className={
                  roleInfo?.hasDuplicates ? "text-red-400 font-bold" : ""
                }
              >
                {roleInfo?.profileCount}
                {roleInfo?.hasDuplicates && " (DUPLICATES DETECTED!)"}
              </span>
            </p>
          </>
        )}
      </div>

      {noProfile && (
        <div className="mt-3 rounded border border-red-600 bg-red-900/30 p-3">
          <p className="text-xs font-semibold text-red-300">
            🚨 Critical: No Profile Found
          </p>
          <p className="mt-1 text-xs text-red-200">
            Your account doesn&rsquo;t have a profile record. This is required
            for the app to work.
          </p>
          <p className="mt-2 text-xs text-red-200">
            Run this SQL in your database to create your profile:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs text-green-400">
            {`-- Create your profile with ADMIN role
INSERT INTO profiles (id, role, full_name, points)
VALUES ('${roleInfo?.userId}', 'ADMIN', 'Administrator', 0)
ON CONFLICT (id) DO UPDATE
SET role = 'ADMIN';`}
          </pre>
          <p className="mt-2 text-xs text-red-200">
            After running this, <strong>refresh the page</strong> to verify.
          </p>
        </div>
      )}

      {roleInfo?.hasDuplicates && (
        <div className="mt-3 rounded border border-red-600 bg-red-900/30 p-3">
          <p className="text-xs font-semibold text-red-300">
            🚨 Critical: Duplicate Profiles
          </p>
          <p className="mt-1 text-xs text-red-200">
            You have {roleInfo.profileCount} duplicate profile records. This
            must be fixed first!
          </p>
          <p className="mt-2 text-xs text-red-200">
            Run this SQL in your database to clean up duplicates:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs text-green-400">
            {`-- Step 1: Delete duplicate profiles (keep the first one)
DELETE FROM profiles
WHERE id = '${roleInfo?.userId}'
AND ctid NOT IN (
  SELECT MIN(ctid)
  FROM profiles
  WHERE id = '${roleInfo?.userId}'
);

-- Step 2: Update the remaining profile to ADMIN
UPDATE profiles
SET role = 'ADMIN'
WHERE id = '${roleInfo?.userId}';`}
          </pre>
        </div>
      )}

      {!isAuthorized && !roleInfo?.hasDuplicates && !noProfile && (
        <div className="mt-3 rounded border border-yellow-600 bg-yellow-900/30 p-3">
          <p className="text-xs font-semibold text-yellow-300">
            ⚠️ Action Required
          </p>
          <p className="mt-1 text-xs text-yellow-200">
            Your role is currently{" "}
            <strong>{roleInfo?.profile?.role || "UNKNOWN"}</strong>. Only
            LIBRARIAN or ADMIN users can upload books.
          </p>
          <p className="mt-2 text-xs text-yellow-200">
            To fix this, run this SQL in your database:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs text-green-400">
            {`UPDATE profiles
SET role = 'ADMIN'
WHERE id = '${roleInfo?.userId}';`}
          </pre>
        </div>
      )}

      {isAuthorized && !roleInfo?.hasDuplicates && (
        <div className="mt-3 rounded border border-green-600 bg-green-900/30 p-3">
          <p className="text-xs font-semibold text-green-300">✓ All Set!</p>
          <p className="mt-1 text-xs text-green-200">
            You have the correct permissions to upload books and manage content.
          </p>
        </div>
      )}
    </div>
  );
};
