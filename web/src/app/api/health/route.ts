import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Basic health check that returns 200 OK
  // You can add more sophisticated checks here if needed
  // (e.g., database connectivity, external service status, etc.)

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
