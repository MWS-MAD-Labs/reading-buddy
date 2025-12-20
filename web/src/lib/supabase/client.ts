import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

export const createSupabaseBrowserClient = () => {
  // Get runtime env vars (works in both browser and server)
  const env = getEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return null if Supabase is not configured (PostgreSQL migration)
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

export type SupabaseBrowserClient = ReturnType<
  typeof createSupabaseBrowserClient
>;
