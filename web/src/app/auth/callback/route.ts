import { NextRequest, NextResponse } from "next/server";

// This route was previously used for Supabase Auth callbacks.
// Since we have migrated to NextAuth (auth.ts), this route is effectively deprecated
// for the main auth flow, but might still be hit by old links or specific providers.
// We will redirect to the dashboard or login page.

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Get the correct origin from headers (for Docker/proxy compatibility)
  const host = request.headers.get("host") || requestUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    requestUrl.protocol.replace(":", "");
  const origin = `${protocol}://${host}`;

  console.log("Legacy auth callback hit. Redirecting to:", nextPath);

  // Redirect to the target path
  return NextResponse.redirect(new URL(nextPath, origin));
}

export async function POST(request: NextRequest) {
  // Handle any POST requests (e.g. from Supabase Auth hooks if any were configured)
  // Just return success to acknowledge receipt
  return NextResponse.json({ received: true, message: "Legacy endpoint" });
}
