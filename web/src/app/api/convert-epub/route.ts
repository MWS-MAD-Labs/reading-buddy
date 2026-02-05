/**
 * EPUB to PDF Conversion API using Calibre
 * Converts EPUB files to PDF, then uses existing PDF rendering pipeline
 */

import { NextRequest, NextResponse } from "next/server";
import { getMinioClient, getMinioBucketName } from "@/lib/minio";
import {
  getObjectKeyFromPublicUrl,
  buildPublicObjectUrl,
} from "@/lib/minioUtils";
import { withRateLimit } from "@/lib/middleware/withRateLimit";
import { createReadStream, createWriteStream } from "fs";
import { stat, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { query } from "@/lib/db";
import { pipeline } from "stream/promises";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

interface ConversionRequest {
  bookId: number;
  epubUrl: string;
}

interface ConversionResponse {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

/**
 * POST /api/convert-epub
 * Convert EPUB to PDF using Calibre
 */
async function convertEpubHandler(
  request: NextRequest,
): Promise<NextResponse<ConversionResponse>> {
  try {
    const body: ConversionRequest = await request.json();
    const { bookId, epubUrl } = body;

    if (!bookId || !epubUrl) {
      return NextResponse.json(
        { success: false, error: "Missing bookId or epubUrl" },
        { status: 400 },
      );
    }

    console.log(`Starting EPUB to PDF conversion for book ${bookId}`);

    // 1. Download EPUB from MinIO
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const objectKey = getObjectKeyFromPublicUrl(epubUrl);

    if (!objectKey) {
      return NextResponse.json(
        { success: false, error: "Invalid EPUB URL" },
        { status: 400 },
      );
    }

    const stream = await minioClient.getObject(bucketName, objectKey);

    // 2. Save EPUB to temp file
    const tempId = randomUUID();
    const epubPath = join(tmpdir(), `${tempId}.epub`);
    const pdfPath = join(tmpdir(), `${tempId}.pdf`);
    await pipeline(stream, createWriteStream(epubPath));
    const { size: epubSize } = await stat(epubPath);
    console.log(`Downloaded EPUB: ${epubSize} bytes`);
    console.log(`Saved EPUB to: ${epubPath}`);

    // 3. Convert EPUB to PDF using Calibre
    try {
      const { stdout, stderr } = await execAsync(
        `ebook-convert "${epubPath}" "${pdfPath}" --paper-size a4 --pdf-default-font-size 18 --margin-left 20 --margin-right 20 --margin-top 20 --margin-bottom 20`,
        { timeout: 240000 }, // 4 minute timeout
      );

      if (stderr && !stderr.includes("Input plugin:")) {
        console.warn("Calibre warnings:", stderr);
      }

      console.log("Calibre conversion completed");
    } catch (error) {
      console.error("Calibre conversion error:", error);
      // Cleanup temp files
      await unlink(epubPath).catch(() => {});
      await unlink(pdfPath).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          error: `Calibre conversion failed: ${error instanceof Error ? error.message : "unknown error"}`,
        },
        { status: 500 },
      );
    }

    // 4. Upload converted PDF to MinIO
    const pdfObjectKey = `books/converted/${bookId}.pdf`;

    const pdfStats = await stat(pdfPath);
    const pdfStream = createReadStream(pdfPath);

    await minioClient.putObject(bucketName, pdfObjectKey, pdfStream, pdfStats.size, {
      "Content-Type": "application/pdf",
    });

    console.log(`Uploaded converted PDF to MinIO: ${pdfObjectKey}`);

    // 5. Build public URL for the converted PDF
    const pdfPublicUrl = buildPublicObjectUrl(pdfObjectKey);

    // 6. Update database with converted PDF URL
    console.log(
      `[EPUB Conversion] About to update database for book ${bookId}`,
    );
    console.log(`[EPUB Conversion] New PDF URL: ${pdfPublicUrl}`);

    try {
      // First, verify the book exists
      const checkResult = await query(
        "SELECT id, title, pdf_url, original_file_url FROM books WHERE id = $1",
        [bookId],
      );

      if (checkResult.rows.length === 0) {
        console.error(
          `[EPUB Conversion] ERROR: Book ${bookId} not found in database!`,
        );
        throw new Error(`Book ${bookId} not found`);
      }

      console.log(`[EPUB Conversion] Book found:`, checkResult.rows[0]);

      // Now update the pdf_url
      const result = await query(
        "UPDATE books SET pdf_url = $1 WHERE id = $2 RETURNING id, pdf_url",
        [pdfPublicUrl, bookId],
      );

      console.log(
        `[EPUB Conversion] ✅ Successfully updated book ${bookId} with pdf_url: ${pdfPublicUrl}`,
      );
      console.log(`[EPUB Conversion] Update result:`, result.rows[0]);
      console.log(`[EPUB Conversion] Rows affected: ${result.rowCount}`);

      if (result.rowCount === 0) {
        console.error(
          `[EPUB Conversion] ERROR: No rows updated for book ${bookId}!`,
        );
      }
    } catch (updateError) {
      console.error("[EPUB Conversion] Database update error:", updateError);
      console.error("[EPUB Conversion] Update details:", {
        bookId,
        pdfPublicUrl,
      });
      // Don't fail the request, PDF is already uploaded
      throw updateError; // Re-throw to see the error in the response
    }

    // 7. Cleanup temp files
    await unlink(epubPath).catch((e) =>
      console.error("Failed to delete temp EPUB:", e),
    );
    await unlink(pdfPath).catch((e) =>
      console.error("Failed to delete temp PDF:", e),
    );

    console.log(
      `Successfully converted EPUB to PDF for book ${bookId}: ${pdfPublicUrl}`,
    );

    return NextResponse.json({
      success: true,
      pdfUrl: pdfPublicUrl,
    });
  } catch (error) {
    console.error("EPUB to PDF conversion error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown conversion error",
      },
      { status: 500 },
    );
  }
}

// Export with rate limiting: 5 requests per 15 minutes per IP
export const POST = withRateLimit(convertEpubHandler, {
  type: "fileConversion",
});
