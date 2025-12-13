import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

export const createSupabaseBrowserClient = () => {
  // Get runtime env vars (works in both browser and server)
  const env = getEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase client env vars NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

export type SupabaseBrowserClient = ReturnType<
  typeof createSupabaseBrowserClient
>;
