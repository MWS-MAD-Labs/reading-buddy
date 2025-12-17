"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import type { LoginBroadcast } from "@/lib/broadcasts";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/cn";

type LoginFormProps = {
  broadcast?: LoginBroadcast | null;
};

const toneStyles: Record<
  LoginBroadcast["tone"],
  { border: string; bg: string; text: string }
> = {
  info: {
    border: "border-sky-200",
    bg: "bg-sky-50/80",
    text: "text-sky-900",
  },
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/80",
    text: "text-emerald-900",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50/80",
    text: "text-amber-900",
  },
  alert: {
    border: "border-rose-200",
    bg: "bg-rose-50/80",
    text: "text-rose-900",
  },
};

const GoogleLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#4285F4"
      d="M23.04 12.261c0-.815-.074-1.6-.211-2.353H12v4.454h6.172c-.266 1.43-1.076 2.64-2.29 3.447v2.86h3.704c2.168-1.994 3.454-4.93 3.454-8.408z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.105 0 5.707-1.026 7.61-2.776l-3.704-2.86c-1.03.69-2.351 1.1-3.906 1.1-3.003 0-5.552-2.025-6.46-4.75H1.73v2.98A11.996 11.996 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.54 14.714a7.19 7.19 0 0 1-.375-2.214c0-.77.136-1.522.375-2.214V7.306H1.73A11.996 11.996 0 0 0 0 12.5c0 1.99.475 3.873 1.73 5.194l3.81-2.98z"
    />
    <path
      fill="#EA4335"
      d="M12 4.76c1.68 0 3.186.578 4.374 1.71l3.28-3.28C17.7 1.26 15.105 0 12 0 7.31 0 3.26 2.69 1.73 7.306l3.81 2.98C6.448 6.785 8.997 4.76 12 4.76z"
    />
  </svg>
);

export const LoginFormNextAuth = ({ broadcast }: LoginFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      // Use NextAuth for Google OAuth
      const result = await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: true,
      });

      if (result?.error) {
        setError(result.error);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {/* Broadcast Message */}
      {broadcast && (
        <Card
          className={cn(
            "relative overflow-hidden border-2 transition-all duration-200 hover:shadow-md",
            toneStyles[broadcast.tone].border
          )}
        >
          <div
            className={cn(
              "absolute inset-0 opacity-50",
              toneStyles[broadcast.tone].bg
            )}
          />
          <CardContent className="relative p-6">
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className={cn("text-lg", toneStyles[broadcast.tone].text)}>
                {broadcast.title}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "ml-2 border-current",
                  toneStyles[broadcast.tone].text
                )}
              >
                {broadcast.tone}
              </Badge>
            </div>
            <p className={cn("mb-3 text-sm leading-relaxed", toneStyles[broadcast.tone].text)}>
              {broadcast.body}
            </p>
            {broadcast.linkLabel && broadcast.linkUrl && (
              <Link
                href={broadcast.linkUrl}
                className={cn(
                  "inline-flex items-center text-sm font-medium underline-offset-4 hover:underline",
                  toneStyles[broadcast.tone].text
                )}
              >
                {broadcast.linkLabel}
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Login Card */}
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to continue to Reading Buddy
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="space-y-4">
            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400 font-medium py-6 transition-all duration-200"
              variant="outline"
            >
              {isGoogleLoading ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  Signing in...
                </>
              ) : (
                <>
                  <GoogleLogo />
                  <span className="ml-3">Continue with Google</span>
                </>
              )}
            </Button>

            {/* Info Text */}
            <p className="text-center text-xs text-gray-500">
              Only @millennia21.id accounts are allowed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-gray-600">
        Need help?{" "}
        <Link
          href="/support"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Contact Support
        </Link>
      </p>
    </div>
  );
};
