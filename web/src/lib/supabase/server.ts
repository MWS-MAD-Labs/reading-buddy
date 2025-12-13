import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export const createSupabaseServerClient = async () => {
  // Access env vars at runtime, not at module load time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase server env vars NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Cookie setting can fail in some edge cases, log but don't throw
          console.error("Failed to set cookie:", name, error);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch (error) {
          // Cookie removal can fail in some edge cases, log but don't throw
          console.error("Failed to remove cookie:", name, error);
        }
      },
    },
    auth: {
      // Add retry logic for transient network failures
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
};

export type SupabaseServerClient = SupabaseClient;

/**
 * Get authenticated user with retry logic for transient network failures
 */
export async function getAuthenticatedUser(retries = 2) {
  const supabase = await createSupabaseServerClient();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        // If it's an auth error (not network), don't retry
        if (
          error.message?.includes("JWT") ||
          error.message?.includes("token")
        ) {
          return { data, error };
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        console.error("Failed to get user after retries:", error);
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, 100 * Math.pow(2, attempt)),
      );
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error("Failed to get authenticated user");
}
