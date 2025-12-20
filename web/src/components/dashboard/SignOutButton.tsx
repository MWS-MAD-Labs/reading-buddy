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
      className="btn-3d btn-squish rounded-2xl border-4 border-red-300 bg-gradient-to-r from-red-400 to-pink-400 px-6 py-3 text-base font-black text-white shadow-lg transition hover:from-red-500 hover:to-pink-500 disabled:pointer-events-none disabled:opacity-50"
    >
      {isLoading ? "👋 Signing out…" : "🚪 Sign Out"}
    </button>
  );
};
