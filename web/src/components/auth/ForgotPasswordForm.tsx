"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSupabaseBrowser } from "@/components/providers/SupabaseProvider";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";

export const ForgotPasswordForm = () => {
  const supabase = useSupabaseBrowser();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${origin}/auth/callback?type=recovery`,
        },
      );

      if (resetError) {
        throw resetError;
      }

      setInfo("If that email exists, a reset link is on its way.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to send reset link.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pop-in w-full max-w-5xl">
      <Card
        variant="playful"
        padding="cozy"
        className="border-4 border-white/70"
      >
        <CardContent className="grid gap-8 md:grid-cols-[1.15fr_1fr] md:items-center">
          <div className="space-y-5 md:space-y-6">
            <Badge variant="bubble" className="uppercase tracking-[0.2em]">
              Forgot your password?
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl md:text-4xl">
                🔒 Reset your Reading Buddy access
              </CardTitle>
              <p className="text-base font-semibold text-indigo-600 md:text-lg">
                We&apos;ll send a secure reset link to your school email so you
                can choose a new password.
              </p>
            </div>

            {error ? (
              <Alert variant="error" title="We couldn't send the link">
                {error}
              </Alert>
            ) : info ? (
              <Alert variant="success" title="Check your inbox">
                {info}
              </Alert>
            ) : (
              <Alert variant="info" title="Heads up">
                Use the same email you use for Reading Buddy at school.
              </Alert>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">📧 School email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@school.org"
                />
              </div>

              <Button
                type="submit"
                loading={isLoading}
                size="lg"
                fullWidth
                icon="📮"
              >
                Send reset link
              </Button>
            </form>

            <p className="text-sm font-semibold text-indigo-600">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-black text-purple-700 underline-offset-4 hover:underline"
              >
                Go back to sign in
              </Link>
            </p>
          </div>

          <div className="relative h-full rounded-[24px] border-4 border-white/60 bg-white/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="absolute inset-0 -z-10 rounded-[24px] bg-gradient-to-br from-sky-200/60 via-indigo-100/50 to-teal-100/60 blur-3xl" />
            <div className="mb-4 flex items-center justify-between">
              <span className="text-2xl">🛠️</span>
              <Badge variant="neutral">Quick steps</Badge>
            </div>
            <ul className="space-y-3 text-sm font-semibold text-indigo-700 md:text-base">
              <li className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                Enter your school email
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">📬</span>
                Open the link we send
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🔑</span>
                Choose a fresh password
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                Sign back in and keep reading
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
