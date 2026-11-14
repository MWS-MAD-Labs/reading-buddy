"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, type ReactNode } from "react";
import { keepFresh } from "mws-central-auth/client";

interface NextAuthProviderProps {
  children: ReactNode;
  session?: Session | null;
  hubRefreshUrl?: string | null;
  hubHomeUrl?: string | null;
}

export function NextAuthProvider({
  children,
  session,
  hubRefreshUrl,
  hubHomeUrl,
}: NextAuthProviderProps) {
  useEffect(() => {
    if (!hubRefreshUrl || !hubHomeUrl) return;
    return keepFresh({
      refreshUrl: hubRefreshUrl,
      onEnded: () => window.location.assign(hubHomeUrl),
    });
  }, [hubHomeUrl, hubRefreshUrl]);

  return <SessionProvider session={session}>{children}</SessionProvider>;
}
