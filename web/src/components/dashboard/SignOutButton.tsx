"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/components/providers/SupabaseProvider";

export const SignOutButton = () => {
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/login");
    router.refresh();
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
