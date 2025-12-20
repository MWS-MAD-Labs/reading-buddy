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
    // Skip auth state listener if Supabase is not configured (PostgreSQL migration)
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
      });
    });

    return () => {
      subscription.unsubscribe();
    };
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
