import { NextRequest, NextResponse } from "next/server";
import { applicationUrl } from "@/lib/central/application-url";
import {
  hubSession,
  isHubAuthEnabled,
} from "@/lib/central/hub-session";

export function GET(request: NextRequest) {
  if (!isHubAuthEnabled()) {
    return NextResponse.redirect(applicationUrl("/login", request.url));
  }
  return NextResponse.redirect(hubSession().homeUrl());
}
