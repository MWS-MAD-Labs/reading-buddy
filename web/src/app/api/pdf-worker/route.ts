import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    // Serve the PDF.js worker file from node_modules
    const workerPath = join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.min.mjs",
    );

    const workerContent = await readFile(workerPath, "utf-8");

    return new NextResponse(workerContent, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to load PDF.js worker:", error);
    return new NextResponse("PDF.js worker not found", { status: 404 });
  }
}
