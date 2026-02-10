import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy API for PDF files.
 * Bypasses CORS and private IP restrictions by fetching server-side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const awaitedParams = await params;
  const path = awaitedParams.path.join("/");

  console.log(`[PDF Proxy] Requested path: ${path}`);

  // Get MinIO configuration
  const minioEndpoint =
    process.env.MINIO_ENDPOINT?.replace(/^https?:\/\//, "") || "localhost:9000";
  const minioPort = process.env.MINIO_PORT || "9000";
  const minioUseSsl = process.env.MINIO_USE_SSL === "true";
  const bucketName = process.env.MINIO_BUCKET_NAME || "reading-buddy";

  // Construct the MinIO URL
  const protocol = minioUseSsl ? "https" : "http";
  const minioUrl = `${protocol}://${minioEndpoint}:${minioPort}/${bucketName}/${path}`;

  console.log(`[PDF Proxy] Fetching from MinIO: ${minioUrl}`);
  console.log(
    `[PDF Proxy] MINIO_ENDPOINT: ${minioEndpoint}, PORT: ${minioPort}, BUCKET: ${bucketName}`,
  );

  try {
    const response = await fetch(minioUrl, {
      method: "GET",
      headers: {
        // Forward any cache control headers
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    console.log(`[PDF Proxy] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(
        `[PDF Proxy] Failed to fetch: ${response.status} ${response.statusText}`,
      );
      return new NextResponse(`Failed to fetch PDF: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Get the PDF content
    const pdfBuffer = await response.arrayBuffer();
    console.log(`[PDF Proxy] PDF buffer size: ${pdfBuffer.byteLength} bytes`);

    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[PDF Proxy] Error:", error);
    return new NextResponse("Failed to load PDF", {
      status: 500,
    });
  }
}
