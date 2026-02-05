/**
 * MOBI/AZW/AZW3 to PDF Conversion API using Calibre
 * Converts Kindle formats to PDF, then uses existing PDF rendering pipeline
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
  mobiUrl: string;
  format: "mobi" | "azw" | "azw3";
}

interface ConversionResponse {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

/**
 * POST /api/convert-mobi
 * Convert MOBI/AZW/AZW3 to PDF using Calibre
 */
async function convertMobiHandler(
  request: NextRequest,
): Promise<NextResponse<ConversionResponse>> {
  try {
    const body: ConversionRequest = await request.json();
    const { bookId, mobiUrl, format } = body;

    if (!bookId || !mobiUrl) {
      return NextResponse.json(
        { success: false, error: "Missing bookId or mobiUrl" },
        { status: 400 },
      );
    }

    const formatUpper = format.toUpperCase();
    console.log(`Starting ${formatUpper} to PDF conversion for book ${bookId}`);

    // 1. Download MOBI/AZW/AZW3 from MinIO
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const objectKey = getObjectKeyFromPublicUrl(mobiUrl);

    if (!objectKey) {
      return NextResponse.json(
        { success: false, error: "Invalid file URL" },
        { status: 400 },
      );
    }

    const stream = await minioClient.getObject(bucketName, objectKey);

    // 2. Save MOBI/AZW/AZW3 to temp file
    const tempId = randomUUID();
    const inputPath = join(tmpdir(), `${tempId}.${format}`);
    const pdfPath = join(tmpdir(), `${tempId}.pdf`);
    await pipeline(stream, createWriteStream(inputPath));
    const { size: inputSize } = await stat(inputPath);
    console.log(`Downloaded ${formatUpper}: ${inputSize} bytes`);
    console.log(`Saved ${formatUpper} to: ${inputPath}`);

    // 3. Convert to PDF using Calibre with Kindle-optimized settings
    try {
      const { stdout, stderr } = await execAsync(
        `ebook-convert "${inputPath}" "${pdfPath}" --output-profile kindle --paper-size a4 --pdf-default-font-size 18 --margin-left 20 --margin-right 20 --margin-top 20 --margin-bottom 20`,
        { timeout: 240000 }, // 4 minute timeout
      );

      if (stderr && !stderr.includes("Input plugin:")) {
        console.warn("Calibre warnings:", stderr);
      }

      console.log("Calibre conversion completed");
    } catch (error) {
      console.error("Calibre conversion error:", error);
      // Cleanup temp files
      await unlink(inputPath).catch(() => { });
      await unlink(pdfPath).catch(() => { });

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
    try {
      await query("UPDATE books SET pdf_url = $1 WHERE id = $2", [
        pdfPublicUrl,
        bookId,
      ]);
      console.log(`Updated book ${bookId} with pdf_url: ${pdfPublicUrl}`);
    } catch (updateError) {
      console.error("Error updating book:", updateError);
      // Don't fail the request, PDF is already uploaded
    }

    // 7. Cleanup temp files
    await unlink(inputPath).catch((e) =>
      console.error(`Failed to delete temp ${formatUpper}:`, e),
    );
    await unlink(pdfPath).catch((e) =>
      console.error("Failed to delete temp PDF:", e),
    );

    console.log(
      `Successfully converted ${formatUpper} to PDF for book ${bookId}: ${pdfPublicUrl}`,
    );

    return NextResponse.json({
      success: true,
      pdfUrl: pdfPublicUrl,
    });
  } catch (error) {
    console.error("MOBI/AZW to PDF conversion error:", error);
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
export const POST = withRateLimit(convertMobiHandler, {
  type: "fileConversion",
});
