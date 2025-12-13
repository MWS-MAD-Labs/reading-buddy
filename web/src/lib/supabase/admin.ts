import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;
let cachedEnvVars: { url: string; key: string } | null = null;

export const getSupabaseAdminClient = () => {
  // Get runtime env vars from server
  const env = getServerEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin env vars NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  // If env vars changed or no client exists, recreate the client
  if (
    adminClient &&
    cachedEnvVars &&
    cachedEnvVars.url === supabaseUrl &&
    cachedEnvVars.key === serviceRoleKey
  ) {
    return adminClient;
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  cachedEnvVars = { url: supabaseUrl, key: serviceRoleKey };

  return adminClient;
};

export type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;
