"use client";

import { useState } from "react";
import { useSupabaseBrowser } from "@/components/providers/SupabaseProvider";

export const LoginForm = () => {
  const supabase = useSupabaseBrowser();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const origin = window.location.origin;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            hd: "millennia21.id", // Restrict to millennia21.id workspace
          },
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      setError(message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="pop-in w-full max-w-md rounded-3xl border-4 border-white/30 bg-white/90 p-5 shadow-2xl backdrop-blur md:p-8">
      <div className="mb-6 space-y-2 text-center md:mb-8 md:space-y-3">
        <div className="text-5xl md:text-6xl">📚✨</div>
        <h1 className="text-3xl font-black text-purple-600 md:text-4xl">
          Welcome to Reading Buddy!
        </h1>
        <p className="text-base font-semibold text-purple-500 md:text-lg">
          Sign in with your Millennia21 Google account
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border-4 border-red-300 bg-red-50 px-4 py-3 md:mb-6">
          <p className="text-center text-sm font-bold text-red-600 md:text-base">
            ⚠️ {error}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="btn-3d btn-squish flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl border-4 border-blue-300 bg-white px-6 py-4 text-lg font-black text-blue-600 transition hover:bg-blue-50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 md:text-xl"
      >
        {isGoogleLoading ? "🌟 Redirecting…" : "🎨 Sign In with Google"}
      </button>

      <div className="mt-5 rounded-2xl border-4 border-yellow-300 bg-yellow-50 px-4 py-3 md:mt-6">
        <p className="text-center text-xs font-bold text-yellow-800 md:text-sm">
          🏫 Only @millennia21.id accounts are allowed
        </p>
      </div>
    </div>
  );
};
