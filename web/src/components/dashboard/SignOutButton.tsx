"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export const SignOutButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="heading-font btn-squish focus-ring rounded-full border border-[#B94A4E]/20 bg-[#F8EAEB] px-5 py-2.5 text-sm font-bold text-[#B94A4E] transition hover:bg-[#f1d9db] disabled:pointer-events-none disabled:opacity-50"
    >
      {isLoading ? "Signing out…" : "Sign out"}
    </button>
  );
};
