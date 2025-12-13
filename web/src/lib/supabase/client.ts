import { createBrowserClient } from "@supabase/ssr";

export const createSupabaseBrowserClient = () => {
  // Access env vars at runtime, not at module load time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
