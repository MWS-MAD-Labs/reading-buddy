#!/usr/bin/env tsx

/**
 * Book Image Rendering Script
 *
 * Renders PDF pages to images and uploads them to MinIO storage
 * Can be run manually or triggered from the librarian dashboard
 *
 * Usage: npx tsx scripts/render-book-images.ts --bookId=123
 */

import { getSupabaseAdminClient } from "../web/src/lib/supabase/admin";
import { getMinioClient, getMinioBucketName } from "../web/src/lib/minio";
import { buildPublicPrefixUrl } from "../web/src/lib/minioUtils";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function renderBookImages(bookId: number) {
  console.log(`[Render] Starting render job for book ${bookId}`);

  const supabase = getSupabaseAdminClient();
  const minioClient = getMinioClient();
  const bucketName = getMinioBucketName();

  try {
    // Update job status to processing
    await supabase
      .from("book_render_jobs")
      .update({ status: "processing" })
      .eq("book_id", bookId)
      .eq("status", "pending");

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, pdf_url, page_count")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      throw new Error(`Book ${bookId} not found`);
    }

    console.log(`[Render] Processing "${book.title}"`);

    // Download PDF to temp directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `book-${bookId}-`));
    const pdfPath = path.join(tempDir, "book.pdf");

    console.log(`[Render] Downloading PDF from ${book.pdf_url}`);

    // Download PDF
    const response = await fetch(book.pdf_url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    fs.writeFileSync(pdfPath, Buffer.from(pdfBuffer));

    // Use pdftoppm to convert PDF to images (requires poppler-utils)
    // Check if pdftoppm is available
    try {
      await execAsync("which pdftoppm");
    } catch (error) {
      throw new Error("pdftoppm not found. Please install poppler-utils: brew install poppler");
    }

    const outputDir = path.join(tempDir, "pages");
    fs.mkdirSync(outputDir);

    console.log(`[Render] Converting PDF to images...`);

    // Convert PDF pages to PNG images (300 DPI for quality)
    await execAsync(`pdftoppm -png -r 150 "${pdfPath}" "${path.join(outputDir, "page")}"`);

    // Get list of generated images
    const imageFiles = fs.readdirSync(outputDir).sort();
    const pageCount = imageFiles.length;

    if (pageCount === 0) {
      throw new Error("No images generated from PDF");
    }

    console.log(`[Render] Generated ${pageCount} images`);

    // Upload images to MinIO
    const imagePrefix = `book-images/${bookId}`;

    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i];
      const imagePath = path.join(outputDir, imageFile);
      const pageNumber = i + 1;
      const objectKey = `${imagePrefix}/page-${pageNumber}.png`;

      console.log(`[Render] Uploading page ${pageNumber}/${pageCount}`);

      await minioClient.fPutObject(
        bucketName,
        objectKey,
        imagePath,
        {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        }
      );

      // Update progress in database
      await supabase
        .from("book_render_jobs")
        .update({
          processed_pages: pageNumber,
          total_pages: pageCount,
        })
        .eq("book_id", bookId);
    }

    // Update book with image information
    const publicPrefix = buildPublicPrefixUrl(imagePrefix);

    await supabase
      .from("books")
      .update({
        page_images_prefix: imagePrefix,
        page_images_count: pageCount,
        page_images_rendered_at: new Date().toISOString(),
        page_count: book.page_count || pageCount,
      })
      .eq("id", bookId);

    // Mark job as completed
    await supabase
      .from("book_render_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_pages: pageCount,
        total_pages: pageCount,
      })
      .eq("book_id", bookId);

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`[Render] ✓ Successfully rendered ${pageCount} pages for "${book.title}"`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Render] ✗ Failed to render book ${bookId}:`, errorMessage);

    // Update job status to failed
    await supabase
      .from("book_render_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("book_id", bookId);

    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const bookIdArg = args.find(arg => arg.startsWith("--bookId="));

if (!bookIdArg) {
  console.error("Usage: npx tsx scripts/render-book-images.ts --bookId=<bookId>");
  process.exit(1);
}

const bookId = parseInt(bookIdArg.split("=")[1], 10);

if (isNaN(bookId)) {
  console.error("Invalid bookId");
  process.exit(1);
}

// Run the render job
renderBookImages(bookId)
  .then(() => {
    console.log("[Render] Job completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Render] Job failed:", error);
    process.exit(1);
  });
