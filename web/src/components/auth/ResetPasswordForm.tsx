"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/components/providers/SupabaseProvider";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
  FieldHelper,
  Input,
  Label,
} from "@/components/ui";

export const ResetPasswordForm = () => {
  const router = useRouter();
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
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setInfo("Password updated. Redirecting to dashboard...");
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to reset password.";
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
              Password reset
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl md:text-4xl">
                🔑 Choose a new password
              </CardTitle>
              <p className="text-base font-semibold text-indigo-600 md:text-lg">
                You verified your email. Let&apos;s secure your account before
                jumping back into the dashboard.
              </p>
            </div>

            {error ? (
              <Alert variant="error" title="Could not update password">
                {error}
              </Alert>
            ) : info ? (
              <Alert variant="success" title="Password saved">
                {info}
              </Alert>
            ) : (
              <Alert variant="info" title="Password tips">
                Use at least 8 characters, and mix in numbers or symbols to keep
                things secure.
              </Alert>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">🔐 New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Enter a strong password"
                />
                <FieldHelper>At least 8 characters recommended.</FieldHelper>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">✅ Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Enter it again to confirm"
                />
              </div>

              <Button
                type="submit"
                loading={isLoading}
                size="lg"
                fullWidth
                icon="✨"
              >
                Save and continue
              </Button>
              <p className="text-sm font-semibold text-indigo-600">
                We will redirect you to the dashboard as soon as your password
                is updated.
              </p>
            </form>
          </div>

          <div className="relative h-full rounded-[24px] border-4 border-white/60 bg-white/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="absolute inset-0 -z-10 rounded-[24px] bg-gradient-to-br from-emerald-200/60 via-teal-100/50 to-blue-100/60 blur-3xl" />
            <div className="mb-4 flex items-center justify-between">
              <span className="text-2xl">🧠</span>
              <Badge variant="neutral">Smart password tips</Badge>
            </div>
            <ul className="space-y-3 text-sm font-semibold text-indigo-700 md:text-base">
              <li className="flex items-center gap-2">
                <span className="text-lg">🎲</span>
                Combine words, numbers, and a symbol or two.
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🚫</span>
                Skip birthdays or easy-to-guess info.
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                Keep this password unique to Reading Buddy.
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">⌛</span>
                We will sign you in again right after saving.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
