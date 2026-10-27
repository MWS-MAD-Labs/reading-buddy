import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isHubAuthEnabled } from "@/lib/central/hub-session";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  if (!isProtected && !isAuthRoute) return NextResponse.next();

  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error(
      "[central-auth] Request authentication failed",
      error instanceof Error ? error.message : error,
    );
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", "upstream_unavailable");
    return NextResponse.redirect(redirectUrl);
  }
  const isLoggedIn = Boolean(session?.user);

  // Redirect to login if accessing protected route without session
  if (!isLoggedIn && isProtected) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = isHubAuthEnabled() ? "/auth/sso" : "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if accessing auth route with active session
  if (isLoggedIn && isAuthRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.searchParams.delete("redirectedFrom");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
