import { NextRequest, NextResponse } from "next/server";
import {
  checkRenderStatus,
  renderBookImages,
} from "@/app/(dashboard)/dashboard/librarian/actions";

/**
 * API endpoint to trigger book rendering
 * This can be called from anywhere and will work in Docker environments
 * since it runs within the app container with proper environment variables
 *
 * Usage: POST /api/render-book-images?bookId=123
 */
const getBookIdFromRequest = (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const bookIdStr = searchParams.get("bookId");

  if (!bookIdStr) {
    return { error: "bookId query parameter is required" };
  }

  const bookId = parseInt(bookIdStr, 10);
  if (isNaN(bookId)) {
    return { error: "Invalid bookId" };
  }

  return { bookId };
};

export async function POST(request: NextRequest) {
  try {
    const parsed = getBookIdFromRequest(request);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { bookId } = parsed;

    // Trigger rendering (this will run in background within this container)
    const result = await renderBookImages(bookId);

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Render API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const parsed = getBookIdFromRequest(request);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { bookId } = parsed;

    const status = await checkRenderStatus(bookId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Render status API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
