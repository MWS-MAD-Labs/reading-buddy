import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const redirectWithError = (origin: string, message: string) => {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
};

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Get the correct origin from headers (for Docker/proxy compatibility)
  const host = request.headers.get("host") || requestUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    requestUrl.protocol.replace(":", "");
  const origin = `${protocol}://${host}`;

  if (!code) {
    return redirectWithError(origin, "missing_code");
  }

  const targetPath = type === "recovery" ? "/reset-password" : nextPath;

  // Create a temporary response to collect cookies
  const response = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth exchange error:", error);
    return redirectWithError(origin, error.message || "auth");
  }

  // Verify email domain and create profile if needed
  if (sessionData?.user) {
    const userEmail = sessionData.user.email;

    // Check if email is from millennia21.id domain
    if (!userEmail || !userEmail.endsWith("@millennia21.id")) {
      // Sign out the user
      await supabase.auth.signOut();
      return redirectWithError(
        origin,
        "Only @millennia21.id accounts are allowed",
      );
    }

    // Check if profile exists, if not create one with STUDENT role
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", sessionData.user.id)
      .single();

    if (!existingProfile && supabaseServiceRoleKey) {
      // Create admin client to insert profile
      const adminClient = createClient(supabaseUrl!, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Create profile with STUDENT role and lower_elementary access
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: sessionData.user.id,
          full_name:
            sessionData.user.user_metadata?.full_name ||
            sessionData.user.user_metadata?.name ||
            null,
          role: "STUDENT",
          access_level: "lower_elementary",
          points: 0,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }
    }
  }

  // Now create the redirect response and copy all cookies from the temp response
  const redirectResponse = NextResponse.redirect(new URL(targetPath, origin));

  // Copy all cookies from the temporary response to the redirect response
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

type SupabaseAuthEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "PASSWORD_RECOVERY";

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const { event, session } = (await request.json()) as {
    event: SupabaseAuthEvent;
    session: Session | null;
  };
  const response = NextResponse.json({ received: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
    const { error } = await supabase.auth.setSession(session);
    if (error) {
      console.error("Error syncing Supabase session:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  if (session && event === "PASSWORD_RECOVERY") {
    // Keep the session so user can reset password immediately.
    await supabase.auth.setSession(session);
  }

  return response;
}
