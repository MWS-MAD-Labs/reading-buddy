"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/components/providers/SupabaseProvider";

export const SignupForm = () => {
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsLoading(true);

    if (!supabase) {
      setError("Sign up is not available. Please contact your administrator.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setInfo("Check your inbox to confirm your email, then sign in.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign up.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setIsGoogleLoading(true);

    if (!supabase) {
      setError(
        "Google sign up is not available. Please contact your administrator.",
      );
      setIsGoogleLoading(false);
      return;
    }

    try {
      const origin = window.location.origin;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback` },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-up failed.";
      setError(message);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="pop-in w-full max-w-md rounded-3xl border-4 border-white/30 bg-white/90 p-8 shadow-2xl backdrop-blur">
      <div className="mb-8 space-y-3 text-center">
        <div className="text-6xl">🌟📖</div>
        <h1 className="text-4xl font-black text-purple-600">Join the Fun!</h1>
        <p className="text-lg font-semibold text-purple-500">
          Start your reading adventure today!
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="fullName"
            className="text-base font-bold text-purple-700"
          >
            👤 Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-5 py-3 text-lg font-semibold text-purple-900 transition-all placeholder:text-purple-300"
            placeholder="Your Amazing Name"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-base font-bold text-purple-700"
          >
            📧 Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-5 py-3 text-lg font-semibold text-purple-900 transition-all placeholder:text-purple-300"
            placeholder="your.email@school.org"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-base font-bold text-purple-700"
          >
            🔐 Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            className="w-full rounded-2xl border-4 border-purple-300 bg-white px-5 py-3 text-lg font-semibold text-purple-900 transition-all placeholder:text-purple-300"
            placeholder="Make it super secret!"
          />
          <p className="text-sm font-semibold text-purple-400">
            ✨ At least 8 characters
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border-4 border-red-300 bg-red-50 px-4 py-3">
            <p className="text-center text-base font-bold text-red-600">
              ⚠️ {error}
            </p>
          </div>
        ) : null}
        {info ? (
          <div className="rounded-2xl border-4 border-green-300 bg-green-50 px-4 py-3">
            <p className="text-center text-base font-bold text-green-600">
              ✅ {info}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-3d btn-squish w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-xl font-black text-white transition hover:from-purple-600 hover:to-pink-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? "🎨 Creating account…" : "🎉 Create My Account!"}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-purple-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/90 px-4 text-base font-bold text-purple-400">
              OR
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isGoogleLoading}
          className="btn-3d btn-squish flex w-full items-center justify-center gap-3 rounded-2xl border-4 border-blue-300 bg-white px-6 py-4 text-xl font-black text-blue-600 transition hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-50"
        >
          {isGoogleLoading ? "🌈 Redirecting…" : "🎨 Sign Up with Google"}
        </button>
      </div>
    </div>
  );
};
