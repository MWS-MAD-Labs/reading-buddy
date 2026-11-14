"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export const SignOutButton = ({ hubAuthEnabled = false }: { hubAuthEnabled?: boolean }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    if (hubAuthEnabled) {
      window.location.assign("/auth/logout");
      return;
    }
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="heading-font btn-squish focus-ring rounded-full border border-[#B94A4E]/20 bg-[#F8EAEB] px-5 py-2.5 text-sm font-bold text-[#B94A4E] transition hover:bg-[#f1d9db] disabled:pointer-events-none disabled:opacity-50"
    >
      {isLoading
        ? hubAuthEnabled
          ? "Returning…"
          : "Signing out…"
        : hubAuthEnabled
          ? "Back to Hub"
          : "Sign out"}
    </button>
  );
};
