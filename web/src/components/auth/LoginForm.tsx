"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
    border: "border-[#B8DDF8]/70",
    bg: "bg-[#EFF8FE]",
    text: "text-[#1F2A44]",
  },
  success: {
    border: "border-[#6F8B6A]/35",
    bg: "bg-[#EDF3EB]",
    text: "text-[#486142]",
  },
  warning: {
    border: "border-[#D6A13A]/45",
    bg: "bg-[#FBF2DF]",
    text: "text-[#7a5311]",
  },
  alert: {
    border: "border-[#B94A4E]/35",
    bg: "bg-[#F8EAEB]",
    text: "text-[#B94A4E]",
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

export const LoginForm = ({ broadcast }: LoginFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      // Use NextAuth for Google OAuth
      const result = (await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: true,
      })) as any;

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

  const effectiveBroadcast = useMemo<LoginBroadcast>(
    () =>
      broadcast ?? {
        id: "default",
        title: "Welcome back to Reading Buddy",
        body: "Sign in with your Millennia21 account to continue. Admins can publish updates from the dashboard.",
        tone: "info",
        linkLabel: null,
        linkUrl: null,
      },
    [broadcast],
  );

  return (
    <div className="pop-in w-full max-w-5xl">
      <Card
        variant="playful"
        className="border border-[#eadfda] soft-shadow"
        padding="cozy"
      >
        <CardContent className="grid gap-8 md:grid-cols-[1.35fr_1fr] md:items-center">
          <div className="space-y-5 md:space-y-6">
            <Badge variant="bubble" className="tracking-[0.2em]">
              Reading Buddy
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl text-[#7E1518] md:text-4xl">
                Welcome to Reading Buddy
              </CardTitle>
              <p className="max-w-xl text-base leading-8 text-[#5d4b4c] md:text-lg">
                Use your Millennia21 Google account to continue into a warm,
                school-ready reading space for books, quizzes, and growth.
              </p>
            </div>

            {error ? (
              <Alert variant="error" title="Sign-in failed">
                {error}
              </Alert>
            ) : (
              <Alert variant="info" title="Heads up">
                Only <strong>@millennia21.id</strong> accounts can log in.
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                loading={isGoogleLoading}
                variant="primary"
                size="lg"
                fullWidth
                icon={<GoogleLogo />}
              >
                Sign In with Google
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "relative h-full rounded-[24px] border p-5 card-shadow backdrop-blur",
              toneStyles[effectiveBroadcast.tone].border,
              toneStyles[effectiveBroadcast.tone].bg,
            )}
          >
            <div className="absolute inset-0 -z-10 rounded-[24px] bg-gradient-to-br from-[#B8DDF8]/40 via-white to-[#FBF2DF]/70 blur-3xl" />
            <div className="mb-4 flex items-center justify-between">
              <span className="heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#7E1518]">
                Announcement
              </span>
            </div>
            <div className="space-y-3">
              <h3 className="heading-font text-xl font-bold text-[#241718]">
                {effectiveBroadcast.title}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[#5d4b4c]">
                {effectiveBroadcast.body}
              </p>
              {effectiveBroadcast.linkUrl ? (
                <Link
                  href={effectiveBroadcast.linkUrl}
                  className="heading-font inline-flex items-center gap-2 text-sm font-bold text-[#7E1518] underline-offset-4 hover:underline"
                >
                  {effectiveBroadcast.linkLabel || "Read more"}
                </Link>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
