"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  createSupabaseBrowserClient,
  type SupabaseBrowserClient,
} from "@/lib/supabase/client";

const SupabaseContext = createContext<SupabaseBrowserClient>(null);

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    // Skip auth state listener as NextAuth handles our authentication primarily.
    // This prevents background network errors (AuthRetryableFetchError) from an unreachable Supabase Auth server.
    return;

    /* 
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      fetch("/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, session }),
      }).catch((err) => {
        // Log as warning rather than allowing it to crash as an unhandled rejection
        console.warn(
          "Supabase session sync skipped or failed (safe to ignore if not using Supabase auth):",
          err,
        );
      });
    });

    return () => {
      subscription.unsubscribe();
    };
    */
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabaseBrowser = () => {
  const context = useContext(SupabaseContext);
  // Return null if Supabase is not configured (PostgreSQL migration)
  return context;
};
